from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import HistoricalConversation
from ..schemas import HistoricalConversationCreate, HistoricalConversationResponse
from ..services.rag_service import rag_service

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base"])

@router.get("", response_model=List[HistoricalConversationResponse])
def list_historical_conversations(
    intent: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(HistoricalConversation)
    if intent and intent != "ALL":
        query = query.filter(HistoricalConversation.intent == intent)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (HistoricalConversation.incoming_tweet.ilike(search_fmt)) |
            (HistoricalConversation.agent_reply.ilike(search_fmt)) |
            (HistoricalConversation.customer_handle.ilike(search_fmt)) |
            (HistoricalConversation.brand.ilike(search_fmt))
        )
    return query.order_by(desc(HistoricalConversation.created_at)).all()

@router.post("", response_model=HistoricalConversationResponse)
def create_historical_conversation(
    conv: HistoricalConversationCreate,
    db: Session = Depends(get_db)
):
    record = HistoricalConversation(
        brand=conv.brand or "Hiver",
        customer_handle=conv.customer_handle or "@customer",
        incoming_tweet=conv.incoming_tweet,
        agent_reply=conv.agent_reply,
        intent=conv.intent,
        quality_score=conv.quality_score or 0.95,
        category=conv.category or "Support",
        is_seed=False
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Re-index RAG corpus
    all_convs = db.query(HistoricalConversation).all()
    rag_service.index_conversations(all_convs)
    
    return record

@router.delete("/{conv_id}")
def delete_historical_conversation(conv_id: int, db: Session = Depends(get_db)):
    record = db.query(HistoricalConversation).filter(HistoricalConversation.id == conv_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    
    all_convs = db.query(HistoricalConversation).all()
    rag_service.index_conversations(all_convs)
    
    return {"message": "Historical conversation deleted", "id": conv_id}
