import os
import json
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Conversation, IngestionReport
from ..services.ingestion_pipeline import ingestion_pipeline

router = APIRouter(prefix="/pipeline", tags=["Data Ingestion Pipeline"])

@router.get("/report")
def get_ingestion_report(db: Session = Depends(get_db)):
    """
    Returns the latest TWCS Spotify ingestion cleaning report along with the preview of first 20 cleaned conversations.
    If no run exists, automatically executes on default Kaggle Spotify dataset.
    """
    latest_report = db.query(IngestionReport).order_by(desc(IngestionReport.created_at)).first()
    
    # Also fetch first 20 conversations from DB
    db_conversations = (
        db.query(Conversation)
        .filter(Conversation.brand == "Spotify")
        .order_by(Conversation.created_at.asc())
        .limit(20)
        .all()
    )
    
    if not latest_report or not db_conversations:
        # Run pipeline to populate initial data
        report_data = ingestion_pipeline.run_pipeline(db=db)
        return report_data

    # Format response
    breakdown = {}
    try:
        breakdown = json.loads(latest_report.removed_breakdown_json or "{}")
    except Exception:
        pass

    preview = [
        {
            "conversation_id": c.conversation_id,
            "brand": c.brand,
            "customer_tweet": c.customer_tweet,
            "agent_reply": c.agent_reply,
            "is_customer": c.is_customer,
            "true_intent": c.true_intent,
            "created_at": c.created_at.isoformat() if c.created_at else ""
        }
        for c in db_conversations
    ]

    return {
        "dataset_name": latest_report.dataset_name,
        "brand": latest_report.brand,
        "total_raw_rows": latest_report.total_raw_rows,
        "rows_removed": latest_report.rows_removed,
        "final_cleaned_conversations": latest_report.final_cleaned_conversations,
        "percentage_retained": latest_report.percentage_retained,
        "removed_breakdown": breakdown,
        "preview_conversations": preview,
        "created_at": latest_report.created_at.isoformat() if latest_report.created_at else ""
    }

@router.post("/run")
def run_ingestion_pipeline(
    csv_file_path: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Triggers the Kaggle TWCS Spotify ingestion pipeline.
    Supports either:
    1. Uploaded CSV file
    2. Local file path string (e.g. C:/path/to/twcs.csv)
    3. Default built-in Kaggle Spotify dataset
    """
    target_path = None
    temp_dir = "backend/data/uploads"
    os.makedirs(temp_dir, exist_ok=True)

    if file and file.filename:
        target_path = os.path.join(temp_dir, file.filename)
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    elif csv_file_path and os.path.exists(csv_file_path):
        target_path = csv_file_path

    report_result = ingestion_pipeline.run_pipeline(csv_file_path=target_path, db=db)
    return report_result

@router.get("/preview")
def get_cleaned_preview(limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns the first N (default: 20) cleaned conversations from the database.
    """
    conversations = (
        db.query(Conversation)
        .filter(Conversation.brand == "Spotify")
        .order_by(Conversation.created_at.asc())
        .limit(limit)
        .all()
    )
    
    if not conversations:
        # Run pipeline once if empty
        ingestion_pipeline.run_pipeline(db=db)
        conversations = (
            db.query(Conversation)
            .filter(Conversation.brand == "Spotify")
            .order_by(Conversation.created_at.asc())
            .limit(limit)
            .all()
        )

    return [
        {
            "conversation_id": c.conversation_id,
            "brand": c.brand,
            "customer_tweet": c.customer_tweet,
            "agent_reply": c.agent_reply,
            "is_customer": c.is_customer,
            "true_intent": c.true_intent,
            "created_at": c.created_at.isoformat() if c.created_at else ""
        }
        for c in conversations
    ]
