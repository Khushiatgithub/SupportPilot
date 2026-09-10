import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.rag_reply_generator import rag_reply_generator

router = APIRouter(tags=["RAG Reply Generator"])


class GenerateReplyRequest(BaseModel):
    customer_tweet: str = Field(..., description="Incoming customer tweet text needing support resolution")

    class Config:
        json_schema_extra = {
            "example": {
                "customer_tweet": "My offline downloaded playlists disappeared after the update"
            }
        }


class RetrievedConversationModel(BaseModel):
    rank: int
    conversation_id: str
    customer_tweet: str
    agent_reply: str
    intent: str
    suggested_intent: Optional[str] = None
    true_intent: Optional[str] = None
    similarity_score: float


class GenerateReplyResponse(BaseModel):
    customer_tweet: str
    generated_reply: str
    predicted_intent: str
    confidence: float
    retrieved_conversations: List[RetrievedConversationModel]
    latency_ms: float
    guardrails_passed: bool
    prediction_id: Optional[int] = None
    model_name: Optional[str] = "RAG Spotify Reply Generator (FAISS IndexFlatIP)"


@router.post("/generate-reply", response_model=GenerateReplyResponse)
def generate_reply_endpoint(
    request: GenerateReplyRequest,
    db: Session = Depends(get_db)
):
    """
    POST /generate-reply
    
    1. Vectorizes the customer tweet.
    2. Queries the FAISS IndexFlatIP to retrieve the top 5 most similar historical Spotify conversations.
    3. Synthesizes a grounded, brand-consistent @SpotifyCares Twitter reply.
    4. Validates guardrails (no hallucinated refunds or fake credentials).
    5. Saves prediction and generated reply into the predictions table.
    """
    if not request.customer_tweet or not request.customer_tweet.strip():
        raise HTTPException(status_code=400, detail="customer_tweet cannot be empty")

    result = rag_reply_generator.process_tweet(request.customer_tweet.strip(), db=db)
    return result


@router.get("/rag/status")
def get_rag_status(db: Session = Depends(get_db)):
    """Returns vector index metadata and health status."""
    if not rag_reply_generator.is_indexed:
        rag_reply_generator.build_index(db)

    return {
        "status": "ready" if rag_reply_generator.is_indexed else "unindexed",
        "index_type": "FAISS IndexFlatIP (Cosine Similarity)",
        "total_indexed_conversations": len(rag_reply_generator.metadata_store),
        "embedding_dimension": rag_reply_generator.embedding_dim,
        "model": "Dense Semantic Embeddings (L2 Normalized)"
    }
