# Centralized Structured JSON Logging & Observability for Python Backends (FastAPI & Flask)
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from contextvars import ContextVar
from typing import Optional, Dict, Any
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from flask import request as flask_request, g as flask_g

# ContextVar to store Request ID across async tasks and requests
requestId_var: ContextVar[str] = ContextVar("requestId", default="system")

class CentralizedJSONFormatter(logging.Formatter):
    def __init__(self, service_name: str = "python-ai-server"):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "service": getattr(record, "service", self.service_name),
            "requestId": getattr(record, "requestId", requestId_var.get()),
            "message": record.getMessage(),
        }

        # Include optional structured metadata if provided on log record
        for attr in ["method", "path", "status", "durationMs", "error"]:
            val = getattr(record, attr, None)
            if val is not None:
                log_obj[attr] = val

        if record.exc_info:
            log_obj["error"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)

def get_logger(service_name: str = "python-ai-server") -> logging.Logger:
    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(CentralizedJSONFormatter(service_name=service_name))
        logger.addHandler(handler)

    return logger

# --- FastAPI Observability Middleware ---
class FastAPILoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, service_name: str = "python-ai-server"):
        super().__init__(app)
        self.logger = get_logger(service_name)

    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        token = requestId_var.set(req_id)
        start_time = time.perf_counter()

        method = request.method
        path = request.url.path

        self.logger.info("Incoming HTTP Request", extra={
            "requestId": req_id,
            "method": method,
            "path": path,
        })

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            log_extra = {
                "requestId": req_id,
                "method": method,
                "path": path,
                "status": response.status_code,
                "durationMs": duration_ms,
            }

            if response.status_code >= 500:
                self.logger.error("HTTP Server Error Response", extra=log_extra)
            elif response.status_code >= 400:
                self.logger.warning("HTTP Client Error Response", extra=log_extra)
            else:
                self.logger.info("HTTP Success Response", extra=log_extra)

            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            requestId_var.reset(token)

# --- Flask Observability Hooks ---
def setup_flask_logging(app, service_name: str = "python-route-planner"):
    logger = get_logger(service_name)

    @app.before_request
    def log_flask_request_start():
        req_id = flask_request.headers.get("x-request-id", str(uuid.uuid4()))
        requestId_var.set(req_id)
        flask_g.request_id = req_id
        flask_g.start_time = time.perf_counter()

        logger.info("Incoming HTTP Request", extra={
            "requestId": req_id,
            "method": flask_request.method,
            "path": flask_request.path,
        })

    @app.after_request
    def log_flask_request_end(response):
        req_id = getattr(flask_g, "request_id", "system")
        start_time = getattr(flask_g, "start_time", time.perf_counter())
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        log_extra = {
            "requestId": req_id,
            "method": flask_request.method,
            "path": flask_request.path,
            "status": response.status_code,
            "durationMs": duration_ms,
        }

        if response.status_code >= 500:
            logger.error("HTTP Server Error Response", extra=log_extra)
        elif response.status_code >= 400:
            logger.warning("HTTP Client Error Response", extra=log_extra)
        else:
            logger.info("HTTP Success Response", extra=log_extra)

        response.headers["X-Request-ID"] = req_id
        return response
