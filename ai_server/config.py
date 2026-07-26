import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MongoDB
    MONGO_URI = os.getenv("MONGO_URI")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "SRP")

    # OpenRouter / LLM Models
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    PLANNER_MODEL = os.getenv("PLANNER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")
    EMBED_MODEL = os.getenv("EMBED_MODEL", "nvidia/llama-nemotron-embed-vl-1b-v2:free")
    SUMMARIZER_MODEL = os.getenv("SUMMARIZER_MODEL", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free")
    EMBED_SIMILARITY_THRESHOLD = float(os.getenv("EMBED_SIMILARITY_THRESHOLD", "0.65"))

    # Wikipedia Configuration
    WIKIPEDIA_USER_AGENT = os.getenv("WIKIPEDIA_USER_AGENT", "ThamizhThadamBot/1.0 (https://github.com/nareshjo001/touristGuide)")
    WIKIPEDIA_LANGUAGE = os.getenv("WIKIPEDIA_LANGUAGE", "en")
    WIKIPEDIA_TIMEOUT = int(os.getenv("WIKIPEDIA_TIMEOUT", "15"))

    # TTS Configuration
    TTS_LANGUAGE = os.getenv("TTS_LANGUAGE", "en")
    TTS_SLOW = os.getenv("TTS_SLOW", "false").lower() == "true"

    # CORS
    CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "https://tourist-guide-two.vercel.app,http://localhost:3000,http://localhost:5002,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:5002").split(",")]

    # Ports & Hosts
    FASTAPI_PORT = int(os.getenv("PORT", os.getenv("FASTAPI_PORT", "5001")))
    FASTAPI_HOST = os.getenv("FASTAPI_HOST", "0.0.0.0")
    FLASK_PORT = int(os.getenv("PORT", os.getenv("FLASK_PORT", "8000")))
    FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"

    # Route Planning Constants
    EARTH_RADIUS_KM = float(os.getenv("EARTH_RADIUS_KM", "6371"))
    ROUTE_MAX_PERPENDICULAR_DIST_KM = float(os.getenv("ROUTE_MAX_PERPENDICULAR_DIST_KM", "10"))
    ROUTE_DEFAULT_SPEED_KMPH = float(os.getenv("ROUTE_DEFAULT_SPEED_KMPH", "40"))

config = Config()
