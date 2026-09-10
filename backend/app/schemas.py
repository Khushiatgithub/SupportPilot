from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# ==================== TWEET SCHEMAS ====================
class TweetBase(BaseModel):
    author_handle: str
    author_name: Optional[str] = ""
    content: str
    follower_count: Optional[int] = 150
    is_verified: Optional[bool] = False

class TweetCreate(TweetBase):
    tweet_id: Optional[str] = None

class TweetResponse(TweetBase):
    id: int
    tweet_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== TICKET SCHEMAS ====================
class EscalationReason(BaseModel):
    category: str
    detail: str
    severity: str  # HIGH, MEDIUM, CRITICAL

class TicketResponse(BaseModel):
    id: int
    tweet_id: int
    intent: str
    sub_intent: Optional[str] = ""
    intent_confidence: float
    sentiment_score: float
    sentiment_label: str
    urgency_score: int
    risk_score: float
    status: str
    is_escalated: bool
    is_auto_handled: bool
    escalation_reasons: List[str] = []
    drafted_reply: Optional[str] = ""
    final_reply: Optional[str] = ""
    response_tone: str
    matched_precedents: Optional[List[Dict[str, Any]]] = []
    agent_notes: Optional[str] = ""
    handling_time_ms: int
    created_at: datetime
    updated_at: datetime
    tweet: Optional[TweetResponse] = None

    class Config:
        from_attributes = True

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    final_reply: Optional[str] = None
    agent_notes: Optional[str] = None
    response_tone: Optional[str] = None

class TicketApprove(BaseModel):
    final_reply: Optional[str] = None
    agent_notes: Optional[str] = None

# ==================== CLASSIFY & PIPELINE SCHEMAS ====================
class ClassifyRequest(BaseModel):
    tweet_text: str
    author_handle: Optional[str] = "@customer"
    follower_count: Optional[int] = 200
    is_verified: Optional[bool] = False
    custom_tone: Optional[str] = None

class ClassifyStepTrace(BaseModel):
    step_name: str
    status: str
    duration_ms: float
    output_summary: str
    details: Dict[str, Any] = {}

class ClassifyResponse(BaseModel):
    intent: str
    sub_intent: str
    intent_confidence: float
    all_intent_probabilities: Dict[str, float]
    sentiment_score: float
    sentiment_label: str
    urgency_score: int
    risk_score: float
    entities_extracted: Dict[str, List[str]]
    decision: str  # AUTO_HANDLE or ESCALATE
    is_escalated: bool
    escalation_reasons: List[str]
    draft_reply: str
    matched_historical_replies: List[Dict[str, Any]]
    execution_trace: List[ClassifyStepTrace]
    handling_time_ms: int

# ==================== EVALUATION SCHEMAS ====================
class ConfusionMatrixCell(BaseModel):
    actual: str
    predicted: str
    count: int
    percentage: float

class ConfusionMatrixData(BaseModel):
    labels: List[str]
    matrix: List[List[int]]  # rows: actual, cols: predicted
    cell_details: List[ConfusionMatrixCell]

class ClassMetric(BaseModel):
    intent: str
    precision: float
    recall: float
    f1_score: float
    support: int

class MisclassifiedSample(BaseModel):
    id: int
    tweet_text: str
    actual_intent: str
    predicted_intent: str
    confidence: float
    sentiment: str
    error_type: str

class EvaluationReport(BaseModel):
    id: Optional[int] = None
    name: str
    model_type: str
    sample_size: int
    accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float
    auto_handle_rate: float
    escalation_precision: float
    false_auto_resolve_rate: float
    avg_latency_ms: float
    confusion_matrix: ConfusionMatrixData
    per_class_metrics: List[ClassMetric]
    misclassified_samples: List[MisclassifiedSample]
    created_at: datetime

# ==================== HISTORICAL CONVERSATION SCHEMAS ====================
class HistoricalConversationCreate(BaseModel):
    brand: Optional[str] = "Hiver"
    customer_handle: Optional[str] = "@customer"
    incoming_tweet: str
    agent_reply: str
    intent: str
    category: Optional[str] = "Support"
    quality_score: Optional[float] = 0.95

class HistoricalConversationResponse(HistoricalConversationCreate):
    id: int
    resolution_status: str
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== BRAND SETTINGS SCHEMAS ====================
class BrandSettingsUpdate(BaseModel):
    brand_name: Optional[str] = None
    brand_handle: Optional[str] = None
    default_tone: Optional[str] = None
    auto_handle_threshold: Optional[float] = None
    escalation_sentiment_threshold: Optional[float] = None
    refund_amount_limit: Optional[float] = None
    vip_handles: Optional[List[str]] = None
    banned_keywords: Optional[List[str]] = None
    escalation_rules: Optional[Dict[str, bool]] = None
    auto_reply_enabled: Optional[bool] = None

class BrandSettingsResponse(BaseModel):
    brand_name: str
    brand_handle: str
    default_tone: str
    auto_handle_threshold: float
    escalation_sentiment_threshold: float
    refund_amount_limit: float
    vip_handles: List[str]
    banned_keywords: List[str]
    escalation_rules: Dict[str, bool]
    auto_reply_enabled: bool
    updated_at: datetime

    class Config:
        from_attributes = True
