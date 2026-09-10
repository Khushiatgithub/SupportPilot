import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, ensure_schema_columns, engine
from app.models import IntentPrediction
from app.services.escalation_engine import spotify_escalation_engine


class TestSpotifyEscalationEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_schema_columns(engine)
        cls.client = TestClient(app)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_rule_1_low_confidence_escalation(self):
        """Rule 1: Escalate if confidence < 0.70"""
        res = spotify_escalation_engine.evaluate(
            customer_tweet="How do I change my settings?",
            predicted_intent="General Inquiry",
            confidence=0.62
        )
        self.assertTrue(res["escalation"])
        self.assertFalse(res["auto_handle"])
        self.assertIn("confidence", res["escalation_reason"].lower())
        self.assertIn(res["risk_level"], ["MEDIUM", "HIGH"])

    def test_02_rule_2_duplicate_billing_escalation(self):
        """Rule 2: Escalate billing/refund disputes involving duplicate charges"""
        res = spotify_escalation_engine.evaluate(
            customer_tweet="@SpotifyCares why was my card charged twice this month for premium?",
            predicted_intent="BILLING_SUBSCRIPTION_CHARGES",
            confidence=0.95
        )
        self.assertTrue(res["escalation"])
        self.assertFalse(res["auto_handle"])
        self.assertEqual(res["risk_level"], "HIGH")
        self.assertIn("billing", res["escalation_reason"].lower())

    def test_03_rule_3_account_security_fraud_escalation(self):
        """Rule 3: Escalate account security, fraud, hacked account, or unauthorized login"""
        res = spotify_escalation_engine.evaluate(
            customer_tweet="My account was hacked and someone is using my Spotify from another country!",
            predicted_intent="ACCOUNT_LOGIN_SECURITY",
            confidence=0.94
        )
        self.assertTrue(res["escalation"])
        self.assertFalse(res["auto_handle"])
        self.assertEqual(res["risk_level"], "HIGH")
        self.assertIn("security", res["escalation_reason"].lower())

    def test_04_rule_4_abusive_negative_complaints_escalation(self):
        """Rule 4: Escalate abusive or highly negative complaints"""
        res = spotify_escalation_engine.evaluate(
            customer_tweet="This is a total scam and worst service ever! I will sue your company!",
            predicted_intent="ESCALATION_COMPLAINT",
            confidence=0.91
        )
        self.assertTrue(res["escalation"])
        self.assertFalse(res["auto_handle"])
        self.assertEqual(res["risk_level"], "HIGH")
        self.assertIn("abusive", res["escalation_reason"].lower())

    def test_05_rule_5_safe_auto_handle(self):
        """Rule 5: Auto-handle common playback, connectivity, feature request, and offline playlist issues when confidence >= 0.85"""
        queries = [
            ("All my downloaded offline songs disappeared after the update", "OFFLINE_PLAYLISTS_DOWNLOAD", 0.92),
            ("Can't connect my Spotify app to my Amazon Echo speaker", "DEVICE_SMART_SPEAKER_CONNECT", 0.89),
            ("Music keeps stuttering when streaming songs on 5G", "AUDIO_PLAYBACK_STREAMING", 0.90),
            ("Please add a dark/light mode toggle in the UI settings", "FEATURE_REQUESTS_UI", 0.88),
            ("Spotify app keeps crashing when I launch it", "APP_PERFORMANCE_STABILITY", 0.91)
        ]
        for tweet, intent, conf in queries:
            res = spotify_escalation_engine.evaluate(
                customer_tweet=tweet,
                predicted_intent=intent,
                confidence=conf
            )
            self.assertFalse(res["escalation"], f"Failed for {tweet}")
            self.assertTrue(res["auto_handle"], f"Failed for {tweet}")
            self.assertEqual(res["risk_level"], "LOW", f"Failed for {tweet}")

    def test_06_api_decide_escalation_endpoint(self):
        """API: POST /decide-escalation returns full contract and saves to predictions"""
        payload = {
            "customer_tweet": "I was billed twice for my family plan subscription",
            "predicted_intent": "BILLING_SUBSCRIPTION_CHARGES",
            "confidence": 0.93,
            "generated_reply": "Hi! You can check your receipt history at spotify.com/account...",
            "retrieved_similarity_score": 0.88
        }
        response = self.client.post("/decide-escalation", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["customer_tweet"], payload["customer_tweet"])
        self.assertTrue(data["escalation"])
        self.assertFalse(data["auto_handle"])
        self.assertEqual(data["risk_level"], "HIGH")
        self.assertIn("escalation_reason", data)
        self.assertIsNotNone(data.get("prediction_id"))

        # Verify saved in predictions table
        db_pred = self.db.query(IntentPrediction).filter(IntentPrediction.id == data["prediction_id"]).first()
        self.assertIsNotNone(db_pred)
        self.assertTrue(db_pred.escalation)
        self.assertFalse(db_pred.auto_handle)
        self.assertEqual(db_pred.risk_level, "HIGH")


if __name__ == "__main__":
    unittest.main()
