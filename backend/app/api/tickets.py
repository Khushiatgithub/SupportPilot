import json
import time
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import Ticket, Tweet, BrandSettings
from ..schemas import TicketResponse, TicketUpdate, TicketApprove
from ..services.intent_classifier import intent_classifier
from ..services.sentiment_analyzer import sentiment_analyzer
from ..services.decision_engine import decision_engine
from ..services.reply_generator import reply_generator
from ..services.rag_service import rag_service

router = APIRouter(prefix="/tickets", tags=["Tickets"])

def format_ticket(t: Ticket) -> dict:
    reasons = []
    try:
        reasons = json.loads(t.escalation_reasons or "[]")
    except Exception:
        pass

    precedents = []
    try:
        precedents = json.loads(t.matched_precedents or "[]")
    except Exception:
        pass

    return {
        "id": t.id,
        "tweet_id": t.tweet_id,
        "intent": t.intent,
        "sub_intent": t.sub_intent,
        "intent_confidence": t.intent_confidence,
        "sentiment_score": t.sentiment_score,
        "sentiment_label": t.sentiment_label,
        "urgency_score": t.urgency_score,
        "risk_score": t.risk_score,
        "status": t.status,
        "is_escalated": t.is_escalated,
        "is_auto_handled": t.is_auto_handled,
        "escalation_reasons": reasons,
        "drafted_reply": t.drafted_reply,
        "final_reply": t.final_reply,
        "response_tone": t.response_tone,
        "matched_precedents": precedents,
        "agent_notes": t.agent_notes,
        "handling_time_ms": t.handling_time_ms,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "tweet": {
            "id": t.tweet.id if t.tweet else 0,
            "tweet_id": t.tweet.tweet_id if t.tweet else "",
            "author_handle": t.tweet.author_handle if t.tweet else "",
            "author_name": t.tweet.author_name if t.tweet else "",
            "content": t.tweet.content if t.tweet else "",
            "follower_count": t.tweet.follower_count if t.tweet else 0,
            "is_verified": t.tweet.is_verified if t.tweet else False,
            "created_at": t.tweet.created_at if t.tweet else t.created_at
        } if t.tweet else None
    }

@router.get("")
def list_tickets(
    status: Optional[str] = Query(None),
    intent: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket).join(Tweet)
    
    if status and status != "ALL":
        query = query.filter(Ticket.status == status)
    if intent and intent != "ALL":
        query = query.filter(Ticket.intent == intent)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Tweet.content.ilike(search_fmt)) |
            (Tweet.author_handle.ilike(search_fmt)) |
            (Tweet.author_name.ilike(search_fmt))
        )
        
    tickets = query.order_by(desc(Ticket.created_at)).all()
    return [format_ticket(t) for t in tickets]

@router.get("/stats")
def get_inbox_stats(db: Session = Depends(get_db)):
    total = db.query(Ticket).count()
    auto_handled = db.query(Ticket).filter(Ticket.status == "AUTO_HANDLED").count()
    escalated = db.query(Ticket).filter(Ticket.status == "ESCALATED").count()
    pending = db.query(Ticket).filter(Ticket.status == "PENDING_REVIEW").count()
    resolved = db.query(Ticket).filter(Ticket.status == "RESOLVED").count()
    
    auto_rate = round((auto_handled / max(1, total)) * 100, 1)
    
    return {
        "total_tickets": total,
        "auto_handled": auto_handled,
        "escalated": escalated,
        "pending_review": pending,
        "resolved": resolved,
        "automation_rate_pct": auto_rate
    }

@router.get("/{ticket_id}")
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return format_ticket(t)

@router.patch("/{ticket_id}")
def update_ticket(ticket_id: int, update_data: TicketUpdate, db: Session = Depends(get_db)):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if update_data.status:
        t.status = update_data.status
        if update_data.status == "RESOLVED":
            t.is_escalated = False
    if update_data.final_reply is not None:
        t.final_reply = update_data.final_reply
    if update_data.agent_notes is not None:
        t.agent_notes = update_data.agent_notes
    if update_data.response_tone:
        t.response_tone = update_data.response_tone
        
    db.commit()
    db.refresh(t)
    return format_ticket(t)

@router.post("/{ticket_id}/approve")
def approve_ticket_reply(ticket_id: int, approve_data: TicketApprove, db: Session = Depends(get_db)):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    final_reply = approve_data.final_reply or t.drafted_reply
    t.final_reply = final_reply
    t.status = "RESOLVED"
    if approve_data.agent_notes:
        t.agent_notes = approve_data.agent_notes
        
    db.commit()
    db.refresh(t)
    return format_ticket(t)

@router.post("/{ticket_id}/regenerate-reply")
async def regenerate_reply(ticket_id: int, tone: Optional[str] = None, db: Session = Depends(get_db)):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t or not t.tweet:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    brand_settings = db.query(BrandSettings).first() or BrandSettings()
    use_tone = tone or t.response_tone or brand_settings.default_tone
    
    rag_matches = rag_service.search_similar(t.tweet.content, top_k=2, intent_filter=t.intent)
    entities = intent_classifier.extract_entities(t.tweet.content)
    
    new_reply = await reply_generator.generate_reply(
        tweet_text=t.tweet.content,
        author_handle=t.tweet.author_handle,
        intent=t.intent,
        sub_intent=t.sub_intent,
        tone=use_tone,
        brand_name=brand_settings.brand_name,
        brand_handle=brand_settings.brand_handle,
        historical_matches=rag_matches,
        entities=entities
    )
    
    t.drafted_reply = new_reply
    t.response_tone = use_tone
    db.commit()
    db.refresh(t)
    return format_ticket(t)

@router.delete("/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    db.delete(t)
    db.commit()
    return {"message": "Ticket deleted successfully", "id": ticket_id}

@router.post("/simulate-stream")
def simulate_incoming_tweet(db: Session = Depends(get_db)):
    """Simulates a new incoming customer tweet arriving in real-time."""
    brand_settings = db.query(BrandSettings).first() or BrandSettings()
    
    sample_pool = [
        {"handle": "@startup_lead", "name": "Maya Lin", "text": "Need to add 5 new seats to our Hiver billing plan before tomorrow.", "followers": 480, "verified": False},
        {"handle": "@angry_ops", "name": "Greg Foster", "text": "Outrageous! Emails failed to send for 2 hours and we lost a client. Escalating to management!", "followers": 290, "verified": False},
        {"handle": "@crypto_whale", "name": "Venture VIP", "text": "Is Hiver SOC2 Type II compliance audit report available for enterprise review?", "followers": 45000, "verified": True},
        {"handle": "@jenny_designer", "name": "Jenny Wood", "text": "Can we get custom color labels for tags in the shared mailbox?", "followers": 310, "verified": False},
        {"handle": "@sam_login", "name": "Sam K", "text": "Password reset email link says token expired. Please assist with login.", "followers": 150, "verified": False},
        {"handle": "@refund_seeker", "name": "Carlos M", "text": "Charged $240 for duplicate seats on invoice #88910. Please process a refund.", "followers": 220, "verified": False}
    ]
    
    selected = random.choice(sample_pool)
    tweet_uid = f"tw_sim_{int(time.time())}_{random.randint(10,99)}"
    
    tweet = Tweet(
        tweet_id=tweet_uid,
        author_handle=selected["handle"],
        author_name=selected["name"],
        content=selected["text"],
        follower_count=selected["followers"],
        is_verified=selected["verified"]
    )
    db.add(tweet)
    db.flush()
    
    start_t = time.perf_counter()
    pred_intent, conf, prob_dict, sub_intent, entities = intent_classifier.predict(tweet.content)
    sent_score, sent_label, urg_score, risk_score = sentiment_analyzer.analyze(tweet.content)
    rag_matches = rag_service.search_similar(tweet.content, top_k=2, intent_filter=pred_intent)
    
    decision, is_esc, reasons, calc_risk = decision_engine.evaluate(
        tweet_text=tweet.content,
        author_handle=tweet.author_handle,
        follower_count=tweet.follower_count,
        is_verified=tweet.is_verified,
        intent=pred_intent,
        confidence=conf,
        sentiment_score=sent_score,
        sentiment_label=sent_label,
        urgency_score=urg_score,
        risk_score=risk_score,
        entities=entities,
        brand_settings=brand_settings
    )
    
    draft_reply = reply_generator._generate_fallback_reply(
        tweet_text=tweet.content,
        author_handle=tweet.author_handle,
        intent=pred_intent,
        sub_intent=sub_intent,
        tone=brand_settings.default_tone,
        brand_name=brand_settings.brand_name,
        brand_handle=brand_settings.brand_handle,
        historical_matches=rag_matches,
        entities=entities
    )
    
    status = "ESCALATED" if is_esc else "AUTO_HANDLED"
    final_reply = draft_reply if not is_esc else ""
    handling_time = int((time.perf_counter() - start_t) * 1000)
    
    ticket = Ticket(
        tweet_id=tweet.id,
        intent=pred_intent,
        sub_intent=sub_intent,
        intent_confidence=conf,
        sentiment_score=sent_score,
        sentiment_label=sent_label,
        urgency_score=urg_score,
        risk_score=calc_risk,
        status=status,
        is_escalated=is_esc,
        is_auto_handled=(not is_esc),
        escalation_reasons=json.dumps(reasons),
        drafted_reply=draft_reply,
        final_reply=final_reply,
        response_tone=brand_settings.default_tone,
        matched_precedents=json.dumps(rag_matches),
        handling_time_ms=handling_time
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    return format_ticket(ticket)
