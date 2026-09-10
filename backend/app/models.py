import datetime
import json
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base

class Tweet(Base):
    __tablename__ = "tweets"

    id = Column(Integer, primary_key=True, index=True)
    tweet_id = Column(String(64), unique=True, index=True)
    author_handle = Column(String(100), index=True)
    author_name = Column(String(150), default="")
    content = Column(Text, nullable=False)
    follower_count = Column(Integer, default=150)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationship with support ticket
    ticket = relationship("Ticket", back_populates="tweet", uselist=False, cascade="all, delete-orphan")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    tweet_id = Column(Integer, ForeignKey("tweets.id", ondelete="CASCADE"), nullable=False)
    
    # Classification Results
    intent = Column(String(64), index=True, default="GENERAL_INQUIRY")
    sub_intent = Column(String(128), default="")
    intent_confidence = Column(Float, default=0.0)
    
    # Sentiment & Urgency
    sentiment_score = Column(Float, default=0.0)  # -1.0 to +1.0
    sentiment_label = Column(String(32), default="NEUTRAL")  # VERY_NEGATIVE, NEGATIVE, NEUTRAL, POSITIVE
    urgency_score = Column(Integer, default=5)  # 1 to 10
    risk_score = Column(Float, default=0.0)  # 0.0 to 1.0 Churn/Escalation risk
    
    # Decision Engine
    status = Column(String(32), index=True, default="PENDING_REVIEW") # AUTO_HANDLED, ESCALATED, PENDING_REVIEW, RESOLVED, REJECTED
    is_escalated = Column(Boolean, default=False)
    is_auto_handled = Column(Boolean, default=False)
    escalation_reasons = Column(Text, default="[]")  # JSON list of trigger reasons
    
    # AI Response Engine
    drafted_reply = Column(Text, default="")
    final_reply = Column(Text, default="")
    response_tone = Column(String(32), default="Empathetic & Solution-Oriented")
    matched_precedents = Column(Text, default="[]")  # JSON list of similar historical conversation IDs
    agent_notes = Column(Text, default="")
    
    # Performance & Timing
    handling_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    tweet = relationship("Tweet", back_populates="ticket")

    def get_escalation_reasons(self):
        try:
            return json.loads(self.escalation_reasons or "[]")
        except Exception:
            return []

    def set_escalation_reasons(self, reasons_list):
        self.escalation_reasons = json.dumps(reasons_list)

class HistoricalConversation(Base):
    __tablename__ = "historical_conversations"

    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String(64), default="Hiver", index=True)
    customer_handle = Column(String(100), default="@customer")
    incoming_tweet = Column(Text, nullable=False)
    agent_reply = Column(Text, nullable=False)
    intent = Column(String(64), index=True)
    resolution_status = Column(String(32), default="RESOLVED")
    quality_score = Column(Float, default=0.95)
    category = Column(String(64), default="Support")
    is_seed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class EvaluationBenchmark(Base):
    __tablename__ = "evaluation_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), default="Default Benchmark Run")
    model_type = Column(String(64), default="Hybrid TF-IDF + Semantic RAG")
    sample_size = Column(Integer, default=0)
    
    # Metrics
    accuracy = Column(Float, default=0.0)
    precision_macro = Column(Float, default=0.0)
    recall_macro = Column(Float, default=0.0)
    f1_macro = Column(Float, default=0.0)
    
    # Operational & Safety Metrics
    auto_handle_rate = Column(Float, default=0.0)
    escalation_precision = Column(Float, default=0.0)
    false_auto_resolve_rate = Column(Float, default=0.0)
    avg_latency_ms = Column(Float, default=0.0)
    
    # JSON Payloads
    confusion_matrix_json = Column(Text, default="{}")
    per_class_metrics_json = Column(Text, default="{}")
    misclassified_samples_json = Column(Text, default="[]")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class BrandSettings(Base):
    __tablename__ = "brand_settings"

    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String(64), default="Hiver")
    brand_handle = Column(String(64), default="@HiverHQ")
    default_tone = Column(String(64), default="Empathetic & Solution-Oriented")
    auto_handle_threshold = Column(Float, default=0.80)
    escalation_sentiment_threshold = Column(Float, default=-0.45)
    refund_amount_limit = Column(Float, default=100.0)
    vip_handles_json = Column(Text, default='["@techcrunch", "@verge", "@forbes", "@paulg", "@hiver_vip"]')
    banned_keywords_json = Column(Text, default='["sue", "lawsuit", "lawyer", "attorney", "regulator", "fraud", "police", "fbi", "stolen", "hacked"]')
    escalation_rules_json = Column(Text, default='{"high_urgency_escalate": true, "negative_sentiment_escalate": true, "vip_escalate": true, "low_confidence_escalate": true}')
    auto_reply_enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"

    conversation_id = Column(String(64), primary_key=True, index=True)
    brand = Column(String(100), nullable=False, index=True, default="Spotify")
    customer_tweet = Column(Text, nullable=False)
    agent_reply = Column(Text, nullable=True)
    is_customer = Column(Boolean, default=True, nullable=False)
    true_intent = Column(String(100), nullable=True, index=True)
    suggested_intent = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class IngestionReport(Base):
    __tablename__ = "ingestion_reports"

    id = Column(Integer, primary_key=True, index=True)
    dataset_name = Column(String(128), default="Kaggle Customer Support on Twitter (twcs.csv)")
    brand = Column(String(64), default="Spotify")
    total_raw_rows = Column(Integer, default=0)
    rows_removed = Column(Integer, default=0)
    final_cleaned_conversations = Column(Integer, default=0)
    percentage_retained = Column(Float, default=0.0)
    removed_breakdown_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DiscoveredIntentModel(Base):
    __tablename__ = "discovered_intents"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, unique=True, index=True)
    intent_name = Column(String(100), nullable=False, unique=True, index=True)
    intent_code = Column(String(64), nullable=False, index=True)
    description = Column(Text, nullable=False)
    conversation_count = Column(Integer, default=0)
    percentage = Column(Float, default=0.0)
    top_keywords_json = Column(Text, default="[]")
    sample_tweets_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class IntentPrediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    customer_tweet = Column(Text, nullable=False)
    predicted_intent = Column(String(100), nullable=True, index=True)
    confidence = Column(Float, nullable=True, default=0.9)
    top_3_json = Column(Text, nullable=True, default="[]")
    model_name = Column(String(100), default="RAG Spotify Reply Generator (FAISS)")
    latency_ms = Column(Float, default=0.0)
    generated_reply = Column(Text, nullable=True)
    retrieved_context_json = Column(Text, nullable=True, default="[]")
    auto_handle = Column(Boolean, default=True)
    escalation = Column(Boolean, default=False)
    escalation_reason = Column(Text, nullable=True)
    risk_level = Column(String(32), default="LOW")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class GoldenSetSample(Base):
    __tablename__ = "golden_set_samples"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(64), unique=True, index=True, nullable=False)
    sample_order = Column(Integer, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class LLMJudgeEvaluation(Base):
    __tablename__ = "llm_judge_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    sample_order = Column(Integer, unique=True, index=True, nullable=False)
    prediction_id = Column(Integer, nullable=True)
    customer_tweet = Column(Text, nullable=False)
    generated_reply = Column(Text, nullable=False)
    predicted_intent = Column(String(100), default="General Inquiry")
    escalation_decision_json = Column(Text, default="{}")
    retrieved_context_json = Column(Text, default="[]")
    
    # LLM Judge Ratings (Rubric: 1-5, PASS/FAIL)
    llm_correctness = Column(Integer, default=5)
    llm_groundedness = Column(Integer, default=5)
    llm_empathy = Column(Integer, default=5)
    llm_actionability = Column(Integer, default=5)
    llm_hallucination = Column(String(10), default="PASS")
    llm_reasoning = Column(Text, default="")
    
    # Human Evaluator Ratings (Rubric: 1-5, PASS/FAIL)
    human_correctness = Column(Integer, nullable=True)
    human_groundedness = Column(Integer, nullable=True)
    human_empathy = Column(Integer, nullable=True)
    human_actionability = Column(Integer, nullable=True)
    human_hallucination = Column(String(10), nullable=True)
    human_notes = Column(Text, default="")
    is_human_evaluated = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)



