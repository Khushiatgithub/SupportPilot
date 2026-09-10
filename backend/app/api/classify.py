import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import BrandSettings
from ..schemas import ClassifyRequest, ClassifyResponse, ClassifyStepTrace
from ..services.intent_classifier import intent_classifier, INTENT_DISPLAY_NAMES
from ..services.sentiment_analyzer import sentiment_analyzer
from ..services.decision_engine import decision_engine
from ..services.reply_generator import reply_generator
from ..services.rag_service import rag_service

router = APIRouter(prefix="/classify", tags=["Classify Sandbox"])

@router.post("", response_model=ClassifyResponse)
async def classify_tweet_sandbox(req: ClassifyRequest, db: Session = Depends(get_db)):
    start_total = time.perf_counter()
    traces = []
    
    brand_settings = db.query(BrandSettings).first() or BrandSettings()
    
    # Step 1: Text Tokenization & Entity Extraction
    s1_start = time.perf_counter()
    entities = intent_classifier.extract_entities(req.tweet_text)
    s1_dur = (time.perf_counter() - s1_start) * 1000.0
    traces.append(ClassifyStepTrace(
        step_name="Entity Extraction",
        status="COMPLETED",
        duration_ms=round(s1_dur, 2),
        output_summary=f"Extracted {sum(len(v) for v in entities.values())} key entities (Order IDs, amounts, emails, handles).",
        details=entities
    ))
    
    # Step 2: Intent Classification
    s2_start = time.perf_counter()
    best_intent, conf, prob_dict, sub_intent, _ = intent_classifier.predict(req.tweet_text)
    s2_dur = (time.perf_counter() - s2_start) * 1000.0
    display_intent = INTENT_DISPLAY_NAMES.get(best_intent, best_intent)
    traces.append(ClassifyStepTrace(
        step_name="Intent Classification",
        status="COMPLETED",
        duration_ms=round(s2_dur, 2),
        output_summary=f"Classified as '{display_intent}' with {round(conf*100, 1)}% confidence.",
        details={
            "intent": best_intent,
            "display_name": display_intent,
            "sub_intent": sub_intent,
            "confidence": conf,
            "probabilities": prob_dict
        }
    ))
    
    # Step 3: Sentiment & Urgency Analysis
    s3_start = time.perf_counter()
    sent_score, sent_label, urg_score, risk_score = sentiment_analyzer.analyze(req.tweet_text)
    s3_dur = (time.perf_counter() - s3_start) * 1000.0
    traces.append(ClassifyStepTrace(
        step_name="Sentiment & Urgency Scoring",
        status="COMPLETED",
        duration_ms=round(s3_dur, 2),
        output_summary=f"Detected tone '{sent_label}' (Polarity: {sent_score}), Urgency {urg_score}/10, Risk {risk_score}.",
        details={
            "sentiment_score": sent_score,
            "sentiment_label": sent_label,
            "urgency_score": urg_score,
            "risk_score": risk_score
        }
    ))
    
    # Step 4: Historical RAG Retrieval
    s4_start = time.perf_counter()
    rag_matches = rag_service.search_similar(req.tweet_text, top_k=2, intent_filter=best_intent)
    s4_dur = (time.perf_counter() - s4_start) * 1000.0
    traces.append(ClassifyStepTrace(
        step_name="Historical RAG Retrieval",
        status="COMPLETED",
        duration_ms=round(s4_dur, 2),
        output_summary=f"Retrieved {len(rag_matches)} matching historical resolution precedents.",
        details={"matches": rag_matches}
    ))
    
    # Step 5: Decision Engine (Auto-Handle vs Escalation)
    s5_start = time.perf_counter()
    decision, is_esc, reasons, calc_risk = decision_engine.evaluate(
        tweet_text=req.tweet_text,
        author_handle=req.author_handle,
        follower_count=req.follower_count or 150,
        is_verified=req.is_verified or False,
        intent=best_intent,
        confidence=conf,
        sentiment_score=sent_score,
        sentiment_label=sent_label,
        urgency_score=urg_score,
        risk_score=risk_score,
        entities=entities,
        brand_settings=brand_settings
    )
    s5_dur = (time.perf_counter() - s5_start) * 1000.0
    traces.append(ClassifyStepTrace(
        step_name="Decision Engine Routing",
        status="COMPLETED",
        duration_ms=round(s5_dur, 2),
        output_summary=f"Decision: {decision} ({'Escalated to Human' if is_esc else 'Safe for Auto-Reply'}).",
        details={
            "decision": decision,
            "is_escalated": is_esc,
            "reasons": reasons,
            "calculated_risk": calc_risk
        }
    ))
    
    # Step 6: Response Generation
    s6_start = time.perf_counter()
    use_tone = req.custom_tone or brand_settings.default_tone
    draft_reply = await reply_generator.generate_reply(
        tweet_text=req.tweet_text,
        author_handle=req.author_handle,
        intent=best_intent,
        sub_intent=sub_intent,
        tone=use_tone,
        brand_name=brand_settings.brand_name,
        brand_handle=brand_settings.brand_handle,
        historical_matches=rag_matches,
        entities=entities
    )
    s6_dur = (time.perf_counter() - s6_start) * 1000.0
    traces.append(ClassifyStepTrace(
        step_name="Brand-Consistent Reply Generation",
        status="COMPLETED",
        duration_ms=round(s6_dur, 2),
        output_summary=f"Drafted {len(draft_reply)} char reply adhering to '{use_tone}' brand tone.",
        details={"draft_reply": draft_reply, "char_count": len(draft_reply)}
    ))
    
    total_ms = int((time.perf_counter() - start_total) * 1000.0)
    
    return ClassifyResponse(
        intent=best_intent,
        sub_intent=sub_intent,
        intent_confidence=conf,
        all_intent_probabilities=prob_dict,
        sentiment_score=sent_score,
        sentiment_label=sent_label,
        urgency_score=urg_score,
        risk_score=calc_risk,
        entities_extracted=entities,
        decision=decision,
        is_escalated=is_esc,
        escalation_reasons=reasons,
        draft_reply=draft_reply,
        matched_historical_replies=rag_matches,
        execution_trace=traces,
        handling_time_ms=total_ms
    )
