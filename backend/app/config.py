import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Hiver AI Support Agent"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database: Supports PostgreSQL or SQLite fallback
    _backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _default_db_path = os.path.join(_backend_dir, "hiver_support.db").replace("\\", "/")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_default_db_path}")
    
    # AI API Keys (Optional - built-in fallback NLP inference + RAG available)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    
    # Default Agent Settings
    DEFAULT_BRAND_NAME: str = os.getenv("BRAND_NAME", "Hiver")
    DEFAULT_BRAND_HANDLE: str = os.getenv("BRAND_HANDLE", "@HiverHQ")
    AUTO_HANDLE_CONFIDENCE_THRESHOLD: float = float(os.getenv("AUTO_HANDLE_THRESHOLD", "0.80"))
    ESCALATION_SENTIMENT_THRESHOLD: float = float(os.getenv("ESCALATION_SENTIMENT_THRESHOLD", "-0.45"))
    MAX_REPLY_CHARS: int = 280

settings = Settings()
