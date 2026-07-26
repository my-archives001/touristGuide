# =======================================================================
# Imports
# =======================================================================
import os, json, asyncio, hashlib, logging, math, time, re, sys
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
import numpy as np
import httpx
from concurrent.futures import ThreadPoolExecutor
from gtts import gTTS
import wikipedia
import tempfile
from wikipedia import exceptions as wiki_exceptions
from sklearn.metrics.pairwise import cosine_similarity
from statistics import mean
import datetime
from pymongo import MongoClient

logging.basicConfig(level=logging.INFO)

# =======================================================================
# Load Environment Variable
# =======================================================================
load_dotenv()

# =======================================================================
# Model & Global Vars Initializations
# =======================================================================

from config import config

# --- OpenRouter Config ---
OPENROUTER_API_KEY = config.OPENROUTER_API_KEY
if not OPENROUTER_API_KEY:
    raise RuntimeError("Set OPENROUTER_API_KEY in environment")

# Define the NVIDIA Stack
PLANNER_MODEL = config.PLANNER_MODEL
EMBED_MODEL = config.EMBED_MODEL
SUMMARIZER_MODEL = config.SUMMARIZER_MODEL

# --- MongoDB Connection ---
MONGO_URI = config.MONGO_URI
if not MONGO_URI:
    raise RuntimeError("Set MONGO_URI in .env file")

try:
    client = MongoClient(MONGO_URI)
    db = client.get_default_database(config.MONGO_DB_NAME)
    places_collection = db.places
    print("✅ Connected to MongoDB.")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    sys.exit(1)


from constants import constants
from models import ChatRequest, AIResponse
from security import FastAPIRateLimitMiddleware
from logger import get_logger, FastAPILoggingMiddleware

ai_logger = get_logger("python-ai-server")

# --- Session & Cache Config ---
SESSION_STORE: Dict[str, Dict[str, Any]] = {}
EMBED_CACHE: Dict[str, List[float]] = {}
MAX_SESSION_MESSAGES = constants.MAX_SESSION_MESSAGES
ALLOWED_TOOLS = constants.ALLOWED_TOOLS

_audio_cache = {}
PLACES_CACHE = []

# =======================================================================
# Helper Functions
# =======================================================================

def _hash_embed_key(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

async def run_sync(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        return await loop.run_in_executor(pool, lambda: func(*args, **kwargs))

def session_add_message(conversation_id: str, role: str, text: str):
    s = SESSION_STORE.setdefault(conversation_id, {"messages": [], "embedding": None})
    s["messages"].append({"role": role, "text": text, "ts": time.time()})
    if len(s["messages"]) > MAX_SESSION_MESSAGES:
        s["messages"] = s["messages"][-MAX_SESSION_MESSAGES:]

def session_get_messages(conversation_id: str):
    return SESSION_STORE.get(conversation_id, {}).get("messages", [])

def extract_json(text: str) -> Optional[str]:
    start = text.find("{")
    if start == -1: return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{": depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0: return text[start:i+1]
    return None

def verify_plan(plan: Dict[str, Any]) -> (bool, str):
    if "steps" not in plan or not isinstance(plan["steps"], list): return False, "plan missing steps"
    for idx, s in enumerate(plan["steps"]):
        tool = s.get("tool", "").lower()
        if tool not in ALLOWED_TOOLS: return False, f"tool '{tool}' not allowed"
        params = json.dumps(s.get("params", {}))
        if re.search(r"\b(delete|drop|shutdown|rm -rf)\b", params, re.IGNORECASE):
            return False, "unsafe params"
    return True, "ok"

def triple_text(place):
    triples = []
    subject_id = place.get('place_id', 'unknown') 
    for rel in place.get("related_places", []):
        triples.append(f"{subject_id} related_to {rel}")
    triples.append(f"{subject_id} is_a {place.get('category','place')}")
    return " . ".join(triples)

# =======================================================================
# Cloud Model API Calls
# =======================================================================

async def grok_generate(prompt: str, max_tokens: int = 400, temperature: float = 0.0):
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {
        "model": PLANNER_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only API. You MUST respond with ONLY a valid JSON object. Do not add any text, greetings, or explanations before or after the JSON block."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=httpx.Timeout(constants.LLM_TIMEOUT)) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        resp = r.json()
        return resp["choices"][0]["message"]["content"]

async def get_embedding(text: str) -> List[float]:
    key = _hash_embed_key(text) 
    if key in EMBED_CACHE:
        return EMBED_CACHE[key]
        
    url = "https://openrouter.ai/api/v1/embeddings"
    payload = {
        "model": EMBED_MODEL,
        "input": text
    }
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(constants.LLM_TIMEOUT)) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            emb = r.json()["data"][0]["embedding"]
    except Exception as e:
        print(f"Embedding API error ({e}), using fallback zero-vector.")
        emb = [0.0] * 1536
        
    EMBED_CACHE[key] = emb
    return emb

async def summarize_local(text: str, style: str = "summary", lang: str = "en") -> dict:
    prompt = f"""
    You are a summarization agent. Summarize the following text in a '{style}' style. 
    If style is 'map_pin', keep it under 30 words. If 'summary', 40-80 words. If 'deep', 80-200 words.
    Output ONLY valid JSON with keys: 'summary' (string), 'warnings' (array of strings if data is missing).
    
    Text: {text}
    """
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {
        "model": SUMMARIZER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"}
    }
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            out_text = r.json()["choices"][0]["message"]["content"]
            
        j_str = extract_json(out_text) or out_text
        data = json.loads(j_str)
        summary_text = data.get("summary", "")
        warnings = data.get("warnings", [])
        confidence = 0.95
    except Exception as e:
        print(f"Summarizer failed: {e}")
        summary_text = "Could not generate summary."
        warnings = ["Summarization API error."]
        confidence = 0.0

    return {
        "summary": summary_text.strip(), "style": style, "lang": lang,
        "confidence": confidence, "warnings": warnings
    }

async def tts_local(text: str, voice="default", style="neutral", fmt="mp3", bucket=None) -> dict:
    text_hash = hashlib.md5(f"{text}|{voice}|{style}".encode("utf-8")).hexdigest()
    filename = f"{text_hash[:12]}.{fmt}"
    temp_dir = tempfile.gettempdir() 
    filepath = os.path.join(temp_dir, filename)
    url = f"/static/{filename}"
    
    if text_hash in _audio_cache and os.path.exists(_audio_cache[text_hash]["audio_file"]):
        return _audio_cache[text_hash]
            
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: gTTS(text=text, lang=config.TTS_LANGUAGE, slow=config.TTS_SLOW).save(filepath))
    
    result = {"audio_file": filepath, "audio_url": url, "voice": voice, "style": style}
    _audio_cache[text_hash] = {**result, "expiry": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=6)}
    return result

# =======================================================================
# Retrieval & Indexing Logic
# =======================================================================

async def index_places():
    print("Fetching places from MongoDB...")
    global PLACES_CACHE
    PLACES_CACHE = []
    
    mongo_places = list(places_collection.find({}))
    print(f"Found {len(mongo_places)} documents in MongoDB.")

    for doc in mongo_places:
        try:
            place_data = {
                "place_id": str(doc['_id']),
                "name": doc.get('name', 'Unknown Place'),
                "full_text": doc.get('description', ''),
                "category": doc.get('type', 'Unknown'),
                "location": doc.get('location'),
                "imageUrl": doc.get('imageUrl'),
                "related_places": doc.get('related_places', [])
            }

            text_to_embed = f"{place_data['name']}: {place_data['full_text']}"
            place_data["embedding"] = await get_embedding(text_to_embed)
            
            rel_text = triple_text(place_data)
            place_data["relation_embedding"] = await get_embedding(rel_text)
            
            PLACES_CACHE.append(place_data)

        except Exception as e:
            print(f"Warning: Failed to process document {doc.get('_id')}: {e}")

    print(f"Indexed {len(PLACES_CACHE)} places from MongoDB.")


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


async def retrieve_local(query: str, k: int = 3, allow_wiki_fallback: bool = True):
    global PLACES_CACHE
    if not PLACES_CACHE:
        await index_places()
        if not PLACES_CACHE: return []

    query_emb = np.array(await get_embedding(query), dtype=float)
    scored = []
    best_score = 0.0

    for place in PLACES_CACHE:
        place_emb = np.array(place.get("embedding", np.zeros_like(query_emb)))
        score_main = cosine_sim(query_emb, place_emb)

        rel_emb = place.get("relation_embedding")
        score_rel = cosine_sim(query_emb, np.array(rel_emb)) if rel_emb is not None else 0.0

        combined_score = 0.7 * score_main + 0.3 * score_rel
        scored.append((combined_score, place))
        best_score = max(best_score, combined_score)

    scored.sort(key=lambda x: x[0], reverse=True)
    top_local = []
    for sc, place in scored[:k]:
        top_local.append({
            "id": place["place_id"], "name": place["name"], "full_text": place["full_text"],
            "category": place.get("category"), "location": place.get("location"),
            "imageUrl": place.get("imageUrl"), "score": float(sc), "source": "localDB"
        })

    if allow_wiki_fallback and (best_score < 0.65 or len(top_local) < k):
        try:
            search_results = await run_sync(wikipedia.search, query)
            if search_results:
                best_title = search_results[0]
                try:
                    page = await run_sync(wikipedia.page, best_title, auto_suggest=False)
                except wiki_exceptions.DisambiguationError:
                    page = await run_sync(wikipedia.page, search_results[1], auto_suggest=False) if len(search_results) > 1 else None

                if page:
                    wiki_text = page.summary or (page.content[:2000] if hasattr(page, "content") else "")
                    wiki_image = None
                    images = getattr(page, "images", []) or []
                    for img_url in images:
                        lower = img_url.lower()
                        if lower.endswith((".jpg", ".jpeg", ".png")) and all(x not in lower for x in ("logo", "icon", "badge")):
                            wiki_image = img_url
                            break
                    if not wiki_image and images: wiki_image = images[0]

                    top_local.append({
                        "id": f"wiki::{page.title}", "name": page.title, "full_text": wiki_text[:1200],
                        "category": "Wikipedia", "score": 0.5, "source": "wikipedia",
                        "imageUrl": wiki_image, "images": images
                    })
        except Exception as e:
            print(f"Wikipedia error: {e}")

    return top_local

# =======================================================================
# Agent Orchestration Logic
# =======================================================================

async def get_json_plan_from_llm(user_text, user_profile_summary, conversation):
    try:
        prompt = f"""
        You must create a JSON plan with a "steps" key to answer the user's question.
        Available tools: {json.dumps(list(ALLOWED_TOOLS))}
        
        1. If simple greeting (like "hi", "hello"), return: {{"steps": []}}
        2. If tourist info requested, you MUST use "retrieve" and "summarize" tools.
        Example: {{"steps": [{{"tool": "retrieve", "input": "...", "params": {{"k": 3}}}}, {{"tool": "summarize", "input": "retrieved context"}}]}}
        
        User Question: "{user_text}"
        Conversation: {conversation}
        """
        out_text = await grok_generate(prompt, max_tokens=400)
        plan = json.loads(extract_json(out_text) or '{"steps": []}')
        
        ok, msg = verify_plan(plan)
        if not ok: raise ValueError(msg)
        return plan
    except Exception:
        return {"steps": [{"tool": "retrieve", "input": user_text, "params": {"k": 3}}, {"tool": "summarize", "input": "retrieved context"}]}


async def execute_step(step: Dict[str, Any], session_ctx: Dict[str, Any]):
    tool = step.get("tool", "").lower()
    inp = step.get("input")
    params = step.get("params", {})
    
    if tool == "retrieve":
        return await retrieve_local(inp, k=params.get("k", 3), allow_wiki_fallback=True)
    elif tool == "summarize":
        return await summarize_local(inp)
    elif tool == "tts":
        return await tts_local(inp, voice=params.get("voice", "female_en_in"), fmt=params.get("format", "mp3"))
    elif tool == "embed":
        return {"embedding": await get_embedding(inp)}
    
    return {"error": f"tool {tool} not implemented"}


async def compose_final_answer(exec_results: List[Dict[str, Any]], user_text: str, user_profile_summary: str):
    sources = []
    for item in exec_results:
        step, res = item["step"], item["result"]
        if step["tool"] == "retrieve" and isinstance(res, list):
            sources.extend(res)
            
    sources_sorted = sorted(sources, key=lambda x: x.get("score", 0), reverse=True)[:5]
    avg_score = mean([s.get("score", 0) for s in sources_sorted]) if sources_sorted else 0.0
    sources_text = "\n".join([f"PLACE: {s.get('name')} – {s.get('full_text')}" for s in sources_sorted]) or "No sources."
    
    prompt = f"""
    You are a JSON-only API. Answer the user's question based *only* on SOURCES.
    If "No sources.", have a friendly conversation.
    User Question: {user_text}
    SOURCES: {sources_text}
    Response Format: {{"answer": "...", "sources": ["..."], "confidence": 0.0}}
    """
    
    fallback_mode = False
    try:
        out_text = await asyncio.wait_for(grok_generate(prompt, max_tokens=300), timeout=constants.LLM_TIMEOUT)
        out = json.loads(extract_json(out_text) or out_text)
    except Exception as e:
        print(f"LLM final generation failed ({e}), switching to local DB fallback mode.")
        fallback_mode = True
        if sources_sorted:
            fallback_answer = (
                f"Here is information from our local heritage database:\n\n" +
                "\n\n".join(f"• **{s.get('name', 'Site')}**: {s.get('full_text', '')}" for s in sources_sorted[:3])
            )
        else:
            fallback_answer = "Hello! How can I help you explore heritage sites today?"
        out = {"answer": fallback_answer, "sources": sources_sorted, "confidence": 0.7 if sources_sorted else 0.1}
        
    out.setdefault("confidence", avg_score)
    out.setdefault("sources", sources_sorted)
    out["fallback_mode"] = fallback_mode
    return out


async def orchestrate(text: str, user_id: Optional[str] = None, location: Optional[Dict[str, float]] = None, conversation_id: Optional[str] = None):
    conv = conversation_id or f"user:{user_id or 'anon'}"
    session_add_message(conv, "user", text)
    
    plan = await get_json_plan_from_llm(text, "{}", session_get_messages(conv))
    exec_results = []
    context_for_summary = []
    
    for step in plan.get("steps", []):
        if step.get("tool") == "summarize" and step.get("input") == "retrieved context":
            step["input"] = json.dumps(context_for_summary) 
        res = await execute_step(step, session_ctx={"user_id": user_id})
        if step.get("tool") == "retrieve" and isinstance(res, list):
            context_for_summary.extend(res)
        exec_results.append({"step": step, "result": res})
        
    final = await compose_final_answer(exec_results, text, "{}")
    session_add_message(conv, "assistant", final.get("answer", ""))
    
    audio_url = next((it["result"].get("audio_file") for it in exec_results if it["step"]["tool"] == "tts"), None)
    if not audio_url and final.get("answer"):
        try:
            audio_url = (await tts_local(final["answer"])).get("audio_file")
        except Exception: pass
            
    return {
        "answer": final["answer"], "sources": final["sources"], "confidence": final["confidence"],
        "audio_url": audio_url, "plan": plan, "execution": exec_results,
        "fallback_mode": final.get("fallback_mode", False)
    }


# =======================================================================
# FastAPI Server Wrapper
# =======================================================================

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    ai_logger.info("Seeding local places database from MongoDB...")
    await index_places()
    ai_logger.info("Database seeding completed successfully.")
    yield
    ai_logger.info("Shutting down AI server...")

app = FastAPI(lifespan=lifespan)

# 0. Request ID & Observability Logging Middleware
app.add_middleware(FastAPILoggingMiddleware, service_name="python-ai-server")

# 1. Rate limiting middleware for AI Server
app.add_middleware(FastAPIRateLimitMiddleware, window_seconds=900, max_requests=60)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.head("/")
async def root():
    return {"status": "ok", "service": "thamizh-thadam-ai-bot", "places_indexed": len(PLACES_CACHE)}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "places_indexed": len(PLACES_CACHE)}

@app.post("/api/reindex")
async def reindex_endpoint():
    try:
        await index_places()
        return {"status": "ok", "places_indexed": len(PLACES_CACHE)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/chat", response_model=AIResponse)
async def handle_chat_message(request: ChatRequest):
    try:
        if not PLACES_CACHE:
            await index_places()
        result = await orchestrate(request.message, request.userId, request.location, request.conversationId)
        return AIResponse(**result)
    except Exception as e:
        ai_logger.error(f"Error in chat endpoint: {e}")
        return AIResponse(
            answer="Sorry, an error occurred on my end.",
            sources=[],
            confidence=0.0,
            audio_url=None,
            plan=None,
            execution=None,
            fallback_mode=True
        )

if __name__ == "__main__":
    ai_logger.info(f"Starting Python AI Bot server on http://{config.FASTAPI_HOST}:{config.FASTAPI_PORT}")
    uvicorn.run(app, host=config.FASTAPI_HOST, port=config.FASTAPI_PORT)