# Security and Rate Limiting Middleware for Python AI Server & Route Planner
import time
import asyncio
from typing import Dict, Any
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from flask import request as flask_request, jsonify

class SlidingWindowLimiter:
    def __init__(self, window_seconds: int = 900, max_requests: int = 100):
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.hits: Dict[str, Dict[str, Any]] = {}

    def cleanup(self):
        now = time.time()
        expired = [ip for ip, rec in self.hits.items() if now > rec["reset"]]
        for ip in expired:
            del self.hits[ip]

    def check_rate_limit(self, ip: str) -> (bool, int, int, int):
        self.cleanup()
        now = time.time()
        rec = self.hits.get(ip)
        if not rec or now > rec["reset"]:
            rec = {"count": 1, "reset": now + self.window_seconds}
            self.hits[ip] = rec
        else:
            rec["count"] += 1

        remaining = max(0, self.max_requests - rec["count"])
        reset_ts = int(rec["reset"])
        allowed = rec["count"] <= self.max_requests
        retry_after = max(1, int(rec["reset"] - now)) if not allowed else 0
        return allowed, self.max_requests, remaining, reset_ts, retry_after

# --- FastAPI Middleware ---
class FastAPIRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, window_seconds: int = 900, max_requests: int = 60):
        super().__init__(app)
        self.limiter = SlidingWindowLimiter(window_seconds=window_seconds, max_requests=max_requests)

    async def dispatch(self, request: Request, call_next):
        # Allow health checks without rate limiting
        if request.url.path in ["/api/health", "/ping"]:
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        allowed, limit, remaining, reset_ts, retry_after = self.limiter.check_rate_limit(ip)

        if not allowed:
            headers = {
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(0),
                "X-RateLimit-Reset": str(reset_ts),
                "Retry-After": str(retry_after),
            }
            return JSONResponse(
                status_code=429,
                content={"status": "error", "message": "Too many requests to AI Server. Please try again later."},
                headers=headers
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_ts)
        return response

# --- Flask Rate Limiter Hook ---
flask_limiter = SlidingWindowLimiter(window_seconds=900, max_requests=100)

def check_flask_rate_limit():
    if flask_request.path in ["/api/health", "/ping"]:
        return None
    ip = flask_request.remote_addr or "unknown"
    allowed, limit, remaining, reset_ts, retry_after = flask_limiter.check_rate_limit(ip)
    if not allowed:
        response = jsonify({
            "status": "error",
            "message": "Too many requests to Route Planner. Please try again later."
        })
        response.status_code = 429
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(0)
        response.headers["X-RateLimit-Reset"] = str(reset_ts)
        response.headers["Retry-After"] = str(retry_after)
        return response
    return None
