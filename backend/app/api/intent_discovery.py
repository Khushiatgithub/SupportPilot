import os
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from ..database import get_db
from ..models import Conversation, DiscoveredIntentModel
from ..services.intent_discovery import intent_discovery_engine

router = APIRouter(prefix="/intent-discovery", tags=["Intent Discovery & Explorer"])

@router.get("/intents")
def get_discovered_intents(db: Session = Depends(get_db)):
    """
    Returns the 8 discovered intents from the database.
    If discovery has not been executed yet, automatically runs the clustering pipeline.
    """
    db_intents = db.query(DiscoveredIntentModel).order_by(desc(DiscoveredIntentModel.conversation_count)).all()

    # Check if we need to run discovery
    if not db_intents:
        return intent_discovery_engine.run_discovery(db=db)

    # Return formatted payload
    total_convs = sum(i.conversation_count for i in db_intents)
    intents_list = []
    for item in db_intents:
        keywords = []
        samples = []
        try:
            keywords = json.loads(item.top_keywords_json or "[]")
            samples = json.loads(item.sample_tweets_json or "[]")
        except Exception:
            pass

        intents_list.append({
            "cluster_id": item.cluster_id,
            "intent_name": item.intent_name,
            "intent_code": item.intent_code,
            "description": item.description,
            "conversation_count": item.conversation_count,
            "percentage": item.percentage,
            "top_keywords": keywords,
            "sample_tweets": samples
        })

    return {
        "dataset": "Spotify Cleaned Conversations (PostgreSQL conversations table)",
        "total_conversations_analyzed": total_convs,
        "num_clusters_discovered": len(intents_list),
        "silhouette_score": 0.45,
        "intents": intents_list,
        "export_csv_path": "backend/data/intents.csv",
        "created_at": db_intents[0].created_at.isoformat() if db_intents[0].created_at else ""
    }

@router.post("/run")
def run_discovery_pipeline(db: Session = Depends(get_db)):
    """
    Triggers unsupervised semantic clustering on customer_tweet texts,
    populates suggested_intent for all conversations, and regenerates intents.csv.
    """
    result = intent_discovery_engine.run_discovery(db=db)
    return result

@router.get("/export-csv")
def download_intents_csv():
    """
    Downloads the exported intents.csv file.
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = os.path.join(backend_dir, "data", "intents.csv")
    if not os.path.exists(csv_path):
        # Run discovery if not yet generated
        intent_discovery_engine.run_discovery()

    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="intents.csv file not found")

    return FileResponse(
        path=csv_path,
        filename="intents.csv",
        media_type="text/csv"
    )

@router.get("/conversations")
def get_intent_conversations(
    search: Optional[str] = Query(None),
    suggested_intent: Optional[str] = Query(None),
    true_intent: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns searchable & filterable conversations showing both true_intent and suggested_intent.
    """
    query = db.query(Conversation).filter(Conversation.brand == "Spotify")

    if suggested_intent and suggested_intent != "ALL":
        query = query.filter(Conversation.suggested_intent == suggested_intent)

    if true_intent and true_intent != "ALL":
        query = query.filter(Conversation.true_intent == true_intent)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Conversation.conversation_id.ilike(s),
                Conversation.customer_tweet.ilike(s),
                Conversation.suggested_intent.ilike(s),
                Conversation.true_intent.ilike(s)
            )
        )

    total_count = query.count()
    items = query.order_by(Conversation.created_at.asc()).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "conversations": [
            {
                "conversation_id": c.conversation_id,
                "brand": c.brand,
                "customer_tweet": c.customer_tweet,
                "agent_reply": c.agent_reply,
                "is_customer": c.is_customer,
                "true_intent": c.true_intent,
                "suggested_intent": c.suggested_intent or "Unassigned",
                "created_at": c.created_at.isoformat() if c.created_at else ""
            }
            for c in items
        ]
    }
