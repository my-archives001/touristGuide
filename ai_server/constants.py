# Centralized Application Constants for Python AI Server & Route Planner

class ApplicationConstants:
    # Tool names supported by AI orchestration
    ALLOWED_TOOLS = {"retrieve", "summarize", "translate", "tts", "recommend", "caption", "embed"}
    
    # Confidence Thresholds
    CONFIDENCE_HIGH = 0.95
    CONFIDENCE_LOW = 0.0
    
    # Timeouts (in seconds)
    DEFAULT_TIMEOUT = 15
    LLM_TIMEOUT = 30
    HTTP_CLIENT_TIMEOUT = 30
    
    # Cache Configuration
    AUDIO_CACHE_HOURS = 6
    MAX_TOKENS_PLANNING = 400
    MAX_SESSION_MESSAGES = 10
    
    # Default identifiers
    DEFAULT_USER_ID = "default-user"
    DEFAULT_CONVO_ID = "default-convo"
    
    # Route Planning Geographic Defaults
    EARTH_RADIUS_KM = 6371.0
    ROUTE_DEFAULT_SPEED_KMPH = 40.0
    ROUTE_MAX_PERPENDICULAR_DIST_KM = 10.0

constants = ApplicationConstants()
