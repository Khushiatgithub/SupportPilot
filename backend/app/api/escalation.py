import time
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import IntentPrediction
from ..services.escalation_engine import spotify_escalation_engine

router = APIRouter(tags=["Escalation Decision Engine"])


class DecideEscalationRequest(BaseModel):
    customer_tweet: str = Field(..., description="Customer tweet content")
    predicted_intent: str = Field(..., description="Predicted intent classification name or code")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    generated_reply: Optional[str] = Field(None, description="Generated response draft")
    retrieved_similarity_score: Optional[float] = Field(None, description="Top retrieved historical thread similarity score")

    class Config:
        json_schema_extra = {
            "example": {
                "customer_tweet": "Why was my card billed twice for Spotify Premium?",
                "predicted_intent": "BILLING_SUBSCRIPTION_CHARGES",
                "confidence": 0.92,
                "generated_reply": "Hi! You can check full payment history at spotify.com/account...",
                "retrieved_similarity_score": 0.89
            }
        }


class DecideEscalationResponse(BaseModel):
    customer_tweet: str
    predicted_intent: str
    confidence: float
    auto_handle: bool
    escalation: bool
    escalation_reason: str
    risk_level: str
    rule_triggered: Optional[str] = None
    prediction_id: Optional[int] = None
    generated_reply: Optional[str] = None


@router.post("/decide-escalation", response_model=DecideEscalationResponse)
def decide_escalation_endpoint(
    request: DecideEscalationRequest,
    db: Session = Depends(get_db)
):
    """
    POST /decide-escalation
    
    Evaluates customer tweet against the 5 Spotify Escalation Decision rules:
    1. Escalate if confidence < 0.70.
    2. Escalate billing/refund disputes involving duplicate charges.
    3. Escalate account security, fraud, hacked account, or unauthorized login.
    4. Escalate abusive or highly negative complaints.
    5. Auto-handle common playback, connectivity, feature request, and offline playlist issues when confidence >= 0.85.
    
    Persists decision into the predictions table.
    """
    if not request.customer_tweet or not request.customer_tweet.strip():
        raise HTTPException(status_code=400, detail="customer_tweet cannot be empty")

    decision = spotify_escalation_engine.evaluate(
        customer_tweet=request.customer_tweet.strip(),
        predicted_intent=request.predicted_intent,
        confidence=request.confidence,
        generated_reply=request.generated_reply,
        retrieved_similarity_score=request.retrieved_similarity_score
    )

    # Save decision into predictions table
    prediction_id = None
    try:
        pred_record = IntentPrediction(
            customer_tweet=request.customer_tweet.strip(),
            predicted_intent=request.predicted_intent,
            confidence=request.confidence,
            top_3_json=json.dumps([request.predicted_intent]),
            model_name="Spotify Escalation Decision Engine",
            latency_ms=1.5,
            generated_reply=request.generated_reply or "",
            auto_handle=decision["auto_handle"],
            escalation=decision["escalation"],
            escalation_reason=decision["escalation_reason"],
            risk_level=decision["risk_level"]
        )
        db.add(pred_record)
        db.commit()
        db.refresh(pred_record)
        prediction_id = pred_record.id
    except Exception as e:
        db.rollback()

    return {
        "customer_tweet": request.customer_tweet.strip(),
        "predicted_intent": request.predicted_intent,
        "confidence": request.confidence,
        "auto_handle": decision["auto_handle"],
        "escalation": decision["escalation"],
        "escalation_reason": decision["escalation_reason"],
        "risk_level": decision["risk_level"],
        "rule_triggered": decision.get("rule_triggered"),
        "prediction_id": prediction_id,
        "generated_reply": request.generated_reply
    }
