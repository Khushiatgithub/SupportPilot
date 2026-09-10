from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base, SessionLocal, ensure_schema_columns
from .seed_data import seed_database
from .api import (
    tickets,
    classify,
    evaluation,
    knowledge,
    settings as api_settings,
    pipeline,
    intent_discovery,
    intent_classification,
    golden_set,
    conversations_inbox,
    rag_replies,
    escalation,
    llm_judge
)
from .services.rag_reply_generator import rag_reply_generator

# Create database tables and ensure schema columns
Base.metadata.create_all(bind=engine)
ensure_schema_columns(engine)

# Run initial seed and build FAISS index if necessary
db = SessionLocal()
try:
    seed_database(db)
    rag_reply_generator.build_index(db)
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI Customer Support Automation & Evaluation Platform"
)

# Enable CORS for frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )

# Include API Routers
app.include_router(tickets.router, prefix=settings.API_V1_STR)
app.include_router(classify.router, prefix=settings.API_V1_STR)
app.include_router(evaluation.router, prefix=settings.API_V1_STR)
app.include_router(knowledge.router, prefix=settings.API_V1_STR)
app.include_router(api_settings.router, prefix=settings.API_V1_STR)
app.include_router(pipeline.router, prefix=settings.API_V1_STR)
app.include_router(intent_discovery.router, prefix=settings.API_V1_STR)
app.include_router(intent_classification.router, prefix=settings.API_V1_STR)
app.include_router(intent_classification.router, prefix="") # Root-level mount for /predict-intent
app.include_router(golden_set.router, prefix=settings.API_V1_STR)
app.include_router(conversations_inbox.router, prefix=settings.API_V1_STR)
app.include_router(rag_replies.router, prefix=settings.API_V1_STR)
app.include_router(rag_replies.router, prefix="") # Root-level mount for /generate-reply
app.include_router(escalation.router, prefix=settings.API_V1_STR)
app.include_router(escalation.router, prefix="") # Root-level mount for /decide-escalation
app.include_router(llm_judge.router, prefix=settings.API_V1_STR)
app.include_router(llm_judge.router, prefix="") # Root-level mount for /llm-judge



@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.get("/")
def root():
    return {
        "message": "SupportPilot API is running",
        "docs": "/docs",
        "health": "/api/health"
    }
