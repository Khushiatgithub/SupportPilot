import re
import json
from typing import Dict, Any, Tuple, Optional, List


class SpotifyEscalationDecisionEngine:
    """
    Escalation Decision Engine for the Spotify AI Support Agent.
    
    Evaluates incoming customer tweets against 5 core decision rules:
    1. Escalate if confidence < 0.70.
    2. Escalate billing/refund disputes involving duplicate charges.
    3. Escalate account security, fraud, hacked account, or unauthorized login.
    4. Escalate abusive or highly negative complaints.
    5. Auto-handle common playback, connectivity, feature request, and offline playlist issues when confidence >= 0.85.
    """

    def __init__(self):
        # Rule 2: Billing & Duplicate Charge Keywords
        self.duplicate_billing_patterns = [
            r'charged?\s+(?:twice|2x|two\s+times|double)',
            r'billed?\s+(?:twice|2x|two\s+times|double)',
            r'double\s+(?:charge|billing|charged|billed|payment)',
            r'duplicate\s+(?:charge|billing|charged|payment|transaction)',
            r'two\s+charges',
            r'overcharged?',
            r'unauthorized\s+charge',
            r'wrong\s+amount\s+charged',
            r'refund\s+dispute'
        ]

        # Rule 3: Account Security, Fraud & Hacked Account Keywords
        self.security_fraud_patterns = [
            r'\bhacked\b',
            r'\bhacker\b',
            r'\bstolen\b',
            r'\bhijacked\b',
            r'\bunauthorized\s+(?:login|access|activity|entry)\b',
            r'\bsomeone\s+(?:logged|is\s+using|in\s+my\s+account)\b',
            r'\baccount\s+(?:takeover|compromised|breached|stolen)\b',
            r'\bfraud\b',
            r'\bphishing\b',
            r'\bsecurity\s+breach\b'
        ]

        # Rule 4: Abusive Language, Profanity & High Negative Complaints
        self.abusive_complaint_patterns = [
            r'\bscam\b',
            r'\bscammers\b',
            r'\blawyer\b',
            r'\blawsuit\b',
            r'\bsue\s+(?:you|spotify)\b',
            r'\bpolice\b',
            r'\bfbi\b',
            r'\bgarbage\b',
            r'\btrash\b',
            r'\bworst\s+(?:service|app|company)\b',
            r'\bterrible\s+(?:service|company)\b',
            r'\bdisgusting\b',
            r'\bpathetic\b',
            r'\bidiots\b',
            r'\bhate\s+(?:you|spotify)\b',
            r'\bfurious\b',
            r'\bunacceptable\b',
            r'\bf[*u]ck\b',
            r'\bsh[*i]t\b',
            r'\bbullsh[*i]t\b'
        ]

        # Rule 5: Common Safe Auto-Handle Categories
        self.common_safe_intents = [
            "AUDIO_PLAYBACK_STREAMING",
            "DEVICE_SMART_SPEAKER_CONNECT",
            "FEATURE_REQUESTS_UI",
            "OFFLINE_PLAYLISTS_DOWNLOAD",
            "APP_PERFORMANCE_STABILITY",
            "Audio Streaming & Playback",
            "Smart Speaker & Device Connectivity",
            "Feature Requests & UI Enhancements",
            "Offline Playlists & Storage",
            "App Stability & Crash Reports"
        ]

    def evaluate(
        self,
        customer_tweet: str,
        predicted_intent: str,
        confidence: float,
        generated_reply: Optional[str] = None,
        retrieved_similarity_score: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Executes decision rules and returns:
        - auto_handle: bool
        - escalation: bool
        - escalation_reason: str
        - risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
        """
        text_lower = customer_tweet.lower()
        intent_normalized = predicted_intent.strip()
        conf = float(confidence)

        # ---------------------------------------------------------------------
        # Rule 3: Account Security, Fraud, Hacked Account, or Unauthorized Login
        # ---------------------------------------------------------------------
        for pattern in self.security_fraud_patterns:
            if re.search(pattern, text_lower):
                return {
                    "auto_handle": False,
                    "escalation": True,
                    "escalation_reason": "Critical account security, fraud, or unauthorized login alert detected; requires immediate human agent intervention.",
                    "risk_level": "HIGH",
                    "rule_triggered": "RULE_3_SECURITY_FRAUD"
                }

        # ---------------------------------------------------------------------
        # Rule 2: Billing/Refund Disputes Involving Duplicate Charges
        # ---------------------------------------------------------------------
        for pattern in self.duplicate_billing_patterns:
            if re.search(pattern, text_lower):
                return {
                    "auto_handle": False,
                    "escalation": True,
                    "escalation_reason": "Billing dispute involving duplicate or disputed charges requires manual finance review.",
                    "risk_level": "HIGH",
                    "rule_triggered": "RULE_2_BILLING_DUPLICATE_CHARGES"
                }

        # ---------------------------------------------------------------------
        # Rule 4: Abusive or Highly Negative Complaints / Legal Threats
        # ---------------------------------------------------------------------
        for pattern in self.abusive_complaint_patterns:
            if re.search(pattern, text_lower):
                return {
                    "auto_handle": False,
                    "escalation": True,
                    "escalation_reason": "Abusive language, legal trigger, or severe customer grievance detected; requires human empathy and de-escalation.",
                    "risk_level": "HIGH",
                    "rule_triggered": "RULE_4_ABUSIVE_GRIEVANCE"
                }

        # ---------------------------------------------------------------------
        # Rule 1: Confidence < 0.70
        # ---------------------------------------------------------------------
        if conf < 0.70:
            return {
                "auto_handle": False,
                "escalation": True,
                "escalation_reason": f"Classifier confidence ({round(conf * 100, 1)}% < 70%) is below safe autonomous threshold; human verification required.",
                "risk_level": "HIGH" if conf < 0.50 else "MEDIUM",
                "rule_triggered": "RULE_1_LOW_CONFIDENCE"
            }

        # ---------------------------------------------------------------------
        # Rule 5: Auto-handle common playback, connectivity, feature request,
        # and offline playlist issues when confidence >= 0.85
        # ---------------------------------------------------------------------
        is_common_intent = any(
            c.lower() in intent_normalized.lower() or intent_normalized.upper() in c.upper()
            for c in self.common_safe_intents
        )

        if conf >= 0.85 and is_common_intent:
            return {
                "auto_handle": True,
                "escalation": False,
                "escalation_reason": f"Common support inquiry with high confidence ({round(conf * 100, 1)}% >= 85%); safe for AI auto-resolution.",
                "risk_level": "LOW",
                "rule_triggered": "RULE_5_SAFE_AUTO_HANDLE"
            }

        # ---------------------------------------------------------------------
        # High confidence general inquiry
        # ---------------------------------------------------------------------
        if conf >= 0.85:
            return {
                "auto_handle": True,
                "escalation": False,
                "escalation_reason": f"High confidence support resolution ({round(conf * 100, 1)}%); verified brand solution applied.",
                "risk_level": "LOW",
                "rule_triggered": "SAFE_HIGH_CONFIDENCE"
            }

        # ---------------------------------------------------------------------
        # Moderate confidence (0.70 <= confidence < 0.85)
        # ---------------------------------------------------------------------
        return {
            "auto_handle": True,
            "escalation": False,
            "escalation_reason": f"Support inquiry evaluated with acceptable confidence ({round(conf * 100, 1)}%) and standard troubleshooting resolution.",
            "risk_level": "MEDIUM",
            "rule_triggered": "SAFE_MODERATE_CONFIDENCE"
        }


# Singleton instance
spotify_escalation_engine = SpotifyEscalationDecisionEngine()
