import re
from typing import Dict, Any, Tuple

class SentimentAnalyzer:
    def __init__(self):
        # Lexicon of negative & frustrated indicators in customer support
        self.very_negative_words = {
            "terrible", "horrible", "worst", "awful", "disaster", "scam", "fraud", "stealing",
            "thieves", "furious", "unacceptable", "useless", "garbage", "trash", "pathetic",
            "hate", "sue", "lawsuit", "lawyer", "police", "fuming", "outraged", "ripoff", "cheat"
        }
        self.negative_words = {
            "bad", "broken", "annoying", "annoyed", "frustrated", "frustrating", "slow", "down",
            "bug", "buggy", "glitch", "error", "failed", "failing", "fail", "wrong", "cancel",
            "issue", "problem", "disappointed", "poor", "stuck", "worse", "upset", "losing",
            "overcharged", "waiting", "delayed", "useless", "ridiculous", "refund"
        }
        self.positive_words = {
            "good", "great", "awesome", "excellent", "love", "thanks", "thank", "helpful",
            "fast", "fixed", "amazing", "appreciate", "smooth", "happy", "wonderful", "perfect",
            "solved", "kudos", "brilliant", "nice", "best", "super"
        }
        self.urgency_words = {
            "urgent", "urgently", "asap", "emergency", "immediately", "right now", "locked out",
            "outage", "production down", "critical", "blocked", "deadline", "today", "help me"
        }

    def analyze(self, text: str) -> Tuple[float, str, int, float]:
        """
        Analyzes customer text and returns:
        - sentiment_score (-1.0 to +1.0)
        - sentiment_label ('VERY_NEGATIVE', 'NEGATIVE', 'NEUTRAL', 'POSITIVE')
        - urgency_score (1 to 10)
        - risk_score (0.0 to 1.0)
        """
        clean_text = text.lower()
        words = re.findall(r'\b\w+\b', clean_text)
        
        pos_count = sum(1 for w in words if w in self.positive_words)
        neg_count = sum(1 for w in words if w in self.negative_words)
        very_neg_count = sum(1 for w in words if w in self.very_negative_words)
        urg_count = sum(1 for w in words if w in self.urgency_words)
        
        # Punctuation & casing intensity
        has_all_caps = bool(re.search(r'\b[A-Z]{3,}\b', text))
        has_multi_exclamation = bool(re.search(r'!{2,}', text))
        has_multi_question = bool(re.search(r'\?{2,}', text))
        
        # Calculate raw sentiment score
        neg_weight = neg_count * 0.25 + very_neg_count * 0.6
        pos_weight = pos_count * 0.3
        
        total_tokens = max(len(words), 1)
        raw_score = (pos_weight - neg_weight) / max(1.0, (pos_weight + neg_weight + 0.5))
        
        if has_all_caps and neg_count + very_neg_count > 0:
            raw_score -= 0.2
        if has_multi_exclamation and neg_count + very_neg_count > 0:
            raw_score -= 0.15
            
        sentiment_score = max(-1.0, min(1.0, round(raw_score, 3)))
        
        # Determine label
        if sentiment_score <= -0.5 or very_neg_count >= 1:
            sentiment_label = "VERY_NEGATIVE"
        elif sentiment_score < -0.1 or neg_count >= 1:
            sentiment_label = "NEGATIVE"
        elif sentiment_score > 0.2:
            sentiment_label = "POSITIVE"
        else:
            sentiment_label = "NEUTRAL"
            
        # Determine Urgency (1 to 10)
        urgency = 3
        if urg_count > 0:
            urgency += urg_count * 2.5
        if very_neg_count > 0:
            urgency += 2.5
        elif neg_count > 1:
            urgency += 1.5
        if has_all_caps:
            urgency += 1.5
        if has_multi_exclamation or has_multi_question:
            urgency += 1.0
            
        urgency_score = int(max(1, min(10, round(urgency))))
        
        # Risk Score (0.0 to 1.0 churn/escalation risk)
        risk = (1.0 - (sentiment_score + 1.0) / 2.0) * 0.6 + (urgency_score / 10.0) * 0.4
        risk_score = round(max(0.0, min(1.0, risk)), 3)
        
        return sentiment_score, sentiment_label, urgency_score, risk_score

sentiment_analyzer = SentimentAnalyzer()
