# Pydantic v2/v1 Compatible Models for AI Server and Route Planner
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User query message")
    userId: Optional[str] = Field("default-user", max_length=100, description="Unique user ID")
    conversationId: Optional[str] = Field("default-convo", max_length=100, description="Conversation session ID")
    location: Optional[Dict[str, float]] = Field(None, description="Optional latitude and longitude coordinates")

    @validator("message")
    def strip_message(cls, v):
        clean_v = v.strip()
        if not clean_v:
            raise ValueError("Message cannot be empty or only whitespace")
        return clean_v

    @validator("location")
    def validate_location(cls, v):
        if v:
            lat = v.get("lat", 0.0)
            lon = v.get("lon", 0.0)
            if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
                raise ValueError("Invalid latitude or longitude range")
        return v

class RoutePlanRequest(BaseModel):
    district: str = Field(..., min_length=2, max_length=50, description="District name")
    start: Optional[str] = Field(None, max_length=100, description="Starting heritage site name")

    @validator("district")
    def clean_district(cls, v):
        return v.strip().lower()

class PathFindRequest(BaseModel):
    district: str = Field(..., min_length=2, max_length=50, description="District name")
    start: str = Field(..., min_length=1, max_length=100, description="Start site")
    end: str = Field(..., min_length=1, max_length=100, description="End site")

    @validator("district")
    def clean_district(cls, v):
        return v.strip().lower()

class AIResponse(BaseModel):
    answer: str
    sources: List[Any] = []
    confidence: float = 0.0
    audio_url: Optional[str] = None
    plan: Optional[Dict[str, Any]] = None
    execution: Optional[List[Dict[str, Any]]] = None
    fallback_mode: bool = False
