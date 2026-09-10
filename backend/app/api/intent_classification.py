import json
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import IntentPrediction
from ..services.intent_classifier_production import production_intent_classifier

router = APIRouter(tags=["Production Intent Classification"])

class PredictIntentRequest(BaseModel):
    customer_tweet: str = Field(..., description="Customer tweet text to classify", example="My premium payment failed with Visa debit card")

class TopIntentItem(BaseModel):
    intent: str
    intent_code: Optional[str] = None
    confidence: float
    badge_color: Optional[str] = "teal"

class PredictIntentResponse(BaseModel):
    predicted_intent: str
    intent_code: Optional[str] = None
    confidence: float
    description: Optional[str] = None
    badge_color: Optional[str] = "teal"
    top_3_intents: List[TopIntentItem]
    latency_ms: float
    model_name: Optional[str] = "Nearest Centroid (Sentence Embeddings)"

@router.post("/predict-intent", response_model=PredictIntentResponse)
def predict_intent_endpoint(
    payload: PredictIntentRequest,
    db: Session = Depends(get_db)
):
    """
    Predicts the customer support intent for an incoming tweet.
    Uses the Final Model (Sentence Embeddings + Cosine Similarity Nearest Centroid),
    computes calibrated confidence score, ranks top 3 intents, measures latency,
    and logs the prediction record to the predictions table.
    """
    if not payload.customer_tweet or not payload.customer_tweet.strip():
        raise HTTPException(status_code=400, detail="customer_tweet cannot be empty")

    result = production_intent_classifier.predict(
        customer_tweet=payload.customer_tweet.strip(),
        db=db,
        save_prediction=True
    )
    return result

@router.get("/classifier/evaluation")
def get_classifier_evaluation_endpoint(
    db: Session = Depends(get_db)
):
    """
    Returns comprehensive evaluation metrics on the 20% stratified test set
    comparing the Baseline Model (TF-IDF + Logistic Regression) against
    the Final Model (Sentence Embeddings + Nearest Centroid).
    """
    return production_intent_classifier.get_evaluation_report(db=db)

@router.post("/classifier/retrain")
def retrain_classifier_endpoint(
    db: Session = Depends(get_db)
):
    """
    Forces retraining and evaluation of both Baseline and Final models
    across all cleaned Spotify conversations in the database.
    """
    return production_intent_classifier.train_and_evaluate(db=db)

@router.get("/classifier/predictions")
def get_recent_predictions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns recent predictions logged in the predictions database table.
    """
    total = db.query(IntentPrediction).count()
    items = (
        db.query(IntentPrediction)
        .order_by(desc(IntentPrediction.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    formatted = []
    for p in items:
        top_3 = []
        try:
            top_3 = json.loads(p.top_3_json or "[]")
        except Exception:
            pass

        formatted.append({
            "id": p.id,
            "customer_tweet": p.customer_tweet,
            "predicted_intent": p.predicted_intent,
            "confidence": p.confidence,
            "top_3_intents": top_3,
            "model_name": p.model_name,
            "latency_ms": p.latency_ms,
            "created_at": p.created_at.isoformat() if p.created_at else ""
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "predictions": formatted
    }
