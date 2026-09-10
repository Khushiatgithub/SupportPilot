import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import BrandSettings
from ..schemas import BrandSettingsResponse, BrandSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Brand Settings"])

def format_settings(s: BrandSettings) -> dict:
    vip = []
    try:
        vip = json.loads(s.vip_handles_json or "[]")
    except Exception:
        pass

    banned = []
    try:
        banned = json.loads(s.banned_keywords_json or "[]")
    except Exception:
        pass

    rules = {}
    try:
        rules = json.loads(s.escalation_rules_json or "{}")
    except Exception:
        pass

    return {
        "brand_name": s.brand_name,
        "brand_handle": s.brand_handle,
        "default_tone": s.default_tone,
        "auto_handle_threshold": s.auto_handle_threshold,
        "escalation_sentiment_threshold": s.escalation_sentiment_threshold,
        "refund_amount_limit": s.refund_amount_limit,
        "vip_handles": vip,
        "banned_keywords": banned,
        "escalation_rules": rules,
        "auto_reply_enabled": s.auto_reply_enabled,
        "updated_at": s.updated_at
    }

@router.get("", response_model=BrandSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings_obj = db.query(BrandSettings).first()
    if not settings_obj:
        settings_obj = BrandSettings()
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
    return format_settings(settings_obj)

@router.put("", response_model=BrandSettingsResponse)
def update_settings(update_data: BrandSettingsUpdate, db: Session = Depends(get_db)):
    settings_obj = db.query(BrandSettings).first()
    if not settings_obj:
        settings_obj = BrandSettings()
        db.add(settings_obj)
        db.flush()

    if update_data.brand_name is not None:
        settings_obj.brand_name = update_data.brand_name
    if update_data.brand_handle is not None:
        settings_obj.brand_handle = update_data.brand_handle
    if update_data.default_tone is not None:
        settings_obj.default_tone = update_data.default_tone
    if update_data.auto_handle_threshold is not None:
        settings_obj.auto_handle_threshold = update_data.auto_handle_threshold
    if update_data.escalation_sentiment_threshold is not None:
        settings_obj.escalation_sentiment_threshold = update_data.escalation_sentiment_threshold
    if update_data.refund_amount_limit is not None:
        settings_obj.refund_amount_limit = update_data.refund_amount_limit
    if update_data.vip_handles is not None:
        settings_obj.vip_handles_json = json.dumps(update_data.vip_handles)
    if update_data.banned_keywords is not None:
        settings_obj.banned_keywords_json = json.dumps(update_data.banned_keywords)
    if update_data.escalation_rules is not None:
        settings_obj.escalation_rules_json = json.dumps(update_data.escalation_rules)
    if update_data.auto_reply_enabled is not None:
        settings_obj.auto_reply_enabled = update_data.auto_reply_enabled

    db.commit()
    db.refresh(settings_obj)
    return format_settings(settings_obj)
