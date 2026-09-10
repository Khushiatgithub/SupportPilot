import re
import json
from typing import List, Dict, Any, Tuple
from ..models import BrandSettings

class DecisionEngine:
    def __init__(self):
        pass

    def evaluate(
        self,
        tweet_text: str,
        author_handle: str,
        follower_count: int,
        is_verified: bool,
        intent: str,
        confidence: float,
        sentiment_score: float,
        sentiment_label: str,
        urgency_score: int,
        risk_score: float,
        entities: Dict[str, List[str]],
        brand_settings: BrandSettings
    ) -> Tuple[str, bool, List[str], float]:
        """
        Evaluates whether a ticket can be automatically handled by AI or must be escalated to a human.
        Returns:
        - decision: "AUTO_HANDLE" | "ESCALATE"
        - is_escalated: bool
        - reasons: List[str] (clear reasons for escalation or auto-handling)
        - calculated_risk: float (0.0 to 1.0)
        """
        reasons = []
        lower_text = tweet_text.lower()
        
        # Get settings or defaults
        auto_threshold = getattr(brand_settings, "auto_handle_threshold", 0.80)
        sentiment_threshold = getattr(brand_settings, "escalation_sentiment_threshold", -0.45)
        refund_limit = getattr(brand_settings, "refund_amount_limit", 100.0)
        
        try:
            vip_handles = json.loads(getattr(brand_settings, "vip_handles_json", '[]'))
        except Exception:
            vip_handles = ["@techcrunch", "@verge", "@forbes", "@paulg"]
            
        try:
            banned_keywords = json.loads(getattr(brand_settings, "banned_keywords_json", '[]'))
        except Exception:
            banned_keywords = ["sue", "lawsuit", "lawyer", "attorney", "fraud", "police", "fbi", "stolen", "hacked"]

        # Rule 1: Legal / Regulatory / Banned Keywords
        for kw in banned_keywords:
            if re.search(r'\b' + re.escape(kw.lower()) + r'\b', lower_text):
                reasons.append(f"Legal & Compliance Trigger: Detected sensitive keyword '{kw}' requiring human risk review.")
                
        # Rule 2: Explicit Escalation or Complaint Intent
        if intent == "ESCALATION_COMPLAINT":
            reasons.append("Customer Escalation Intent: User explicitly requested managerial intervention or expressed severe grievance.")
            
        # Rule 3: Extreme Negative Sentiment / Profanity
        if sentiment_score < sentiment_threshold or sentiment_label == "VERY_NEGATIVE":
            reasons.append(f"High Negative Sentiment (Score: {sentiment_score}): Frustrated customer tone detected; human empathy required.")
            
        # Rule 4: Critical Urgency Score
        if urgency_score >= 8:
            reasons.append(f"High Urgency Alert (Score {urgency_score}/10): Immediate or critical operational blocker reported.")
            
        # Rule 5: Low Classifier Confidence
        if confidence < auto_threshold:
            reasons.append(f"Low Classifier Confidence ({round(confidence * 100, 1)}% < {round(auto_threshold * 100, 1)}%): Ambiguous request intent requires agent verification.")
            
        # Rule 6: VIP Customer Account
        if (author_handle.lower() in [v.lower() for v in vip_handles]) or follower_count > 25000 or is_verified:
            reasons.append(f"VIP Customer / High Influence Profile ({follower_count:,} followers, Verified: {is_verified}): High-priority routing.")
            
        # Rule 7: High Value Refund / Financial Claim
        extracted_amounts = entities.get("amounts", [])
        for amt_str in extracted_amounts:
            # Extract number
            amt_match = re.search(r'([0-9]+(?:\.[0-9]{2})?)', amt_str)
            if amt_match:
                amt_val = float(amt_match.group(1))
                if amt_val > refund_limit:
                    reasons.append(f"High-Value Financial Dispute: Requested amount (${amt_val:.2f}) exceeds auto-approval threshold of ${refund_limit:.2f}.")

        # Rule 8: Cancellation / Defection Churn
        if intent == "CANCELLATION_CHURN":
            if "competitor" in lower_text or follower_count > 5000:
                reasons.append("High Churn Defection Risk: Customer mentions competitor or has enterprise-sized account.")

        # Determine final decision
        is_escalated = len(reasons) > 0
        if is_escalated:
            decision = "ESCALATE"
            calculated_risk = max(risk_score, 0.65)
        else:
            decision = "AUTO_HANDLE"
            reasons.append(f"Confidence score {round(confidence * 100, 1)}% exceeds safety threshold ({round(auto_threshold * 100, 1)}%) with neutral/positive sentiment.")
            calculated_risk = min(risk_score, 0.35)
            
        return decision, is_escalated, reasons, calculated_risk

decision_engine = DecisionEngine()
