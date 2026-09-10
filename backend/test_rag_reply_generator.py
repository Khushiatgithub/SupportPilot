import unittest
import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, ensure_schema_columns, engine
from app.models import Conversation, IntentPrediction
from app.services.rag_reply_generator import rag_reply_generator


class TestRagReplyGenerator(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_schema_columns(engine)
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        # Ensure at least some cleaned conversations exist
        spotify_count = cls.db.query(Conversation).filter(Conversation.brand == "Spotify").count()
        if spotify_count == 0:
            sample_convs = [
                Conversation(
                    conversation_id="test_rag_1",
                    brand="Spotify",
                    customer_tweet="My offline playlists disappeared after updating the app.",
                    agent_reply="@SpotifyCares Hi! Make sure you have enough free storage on your device and offline toggle is active.",
                    suggested_intent="Offline Playlists & Storage",
                    true_intent="Offline Playlists & Storage",
                    is_customer=True
                ),
                Conversation(
                    conversation_id="test_rag_2",
                    brand="Spotify",
                    customer_tweet="Why was my card billed twice for Spotify Premium?",
                    agent_reply="@SpotifyCares Hey! You can check your receipts at spotify.com/account or DM us your email.",
                    suggested_intent="Billing & Subscription Inquiries",
                    true_intent="Billing & Subscription Inquiries",
                    is_customer=True
                ),
                Conversation(
                    conversation_id="test_rag_3",
                    brand="Spotify",
                    customer_tweet="My Spotify app keeps crashing on startup on iOS.",
                    agent_reply="@SpotifyCares Hi there! Could you try a clean reinstall of the app?",
                    suggested_intent="App Stability & Crash Reports",
                    true_intent="App Stability & Crash Reports",
                    is_customer=True
                )
            ]
            cls.db.add_all(sample_convs)
            cls.db.commit()

        # Build index
        cls.indexed_count = rag_reply_generator.build_index(cls.db)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_faiss_index_built(self):
        self.assertTrue(rag_reply_generator.is_indexed)
        self.assertIsNotNone(rag_reply_generator.index)
        self.assertGreater(len(rag_reply_generator.metadata_store), 0)

    def test_02_retrieval_top_k(self):
        query = "My downloaded songs are gone and offline mode won't play"
        retrieved = rag_reply_generator.retrieve_top_k(query, k=5, db=self.db)
        self.assertIsInstance(retrieved, list)
        self.assertGreater(len(retrieved), 0)
        self.assertLessEqual(len(retrieved), 5)
        for r in retrieved:
            self.assertIn("conversation_id", r)
            self.assertIn("customer_tweet", r)
            self.assertIn("agent_reply", r)
            self.assertIn("similarity_score", r)
            self.assertGreaterEqual(r["similarity_score"], 0.0)
            self.assertLessEqual(r["similarity_score"], 1.0)

    def test_03_generate_grounded_reply_and_guardrails(self):
        query = "I was double charged for my monthly subscription"
        retrieved = rag_reply_generator.retrieve_top_k(query, k=5, db=self.db)
        reply, intent, guardrails_passed = rag_reply_generator.generate_grounded_reply(query, retrieved)
        self.assertTrue(guardrails_passed)
        self.assertIsInstance(reply, str)
        self.assertGreater(len(reply), 10)
        self.assertLessEqual(len(reply), 280)
        # Verify no hallucinated dollar amounts
        self.assertNotIn("we have refunded $", reply.lower())

    def test_04_api_generate_reply_endpoint(self):
        payload = {"customer_tweet": "Cannot connect my Spotify to Alexa echo dot"}
        response = self.client.post("/generate-reply", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["customer_tweet"], payload["customer_tweet"])
        self.assertIn("generated_reply", data)
        self.assertIn("retrieved_conversations", data)
        self.assertIn("predicted_intent", data)
        self.assertIn("latency_ms", data)
        self.assertTrue(data["guardrails_passed"])
        self.assertEqual(len(data["retrieved_conversations"]), min(5, len(rag_reply_generator.metadata_store)))

    def test_05_api_generate_reply_persistence(self):
        payload = {"customer_tweet": "Can't log in to my family plan account"}
        response = self.client.post("/api/generate-reply", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        pred_id = data.get("prediction_id")
        self.assertIsNotNone(pred_id)

        # Verify saved in predictions table
        db_pred = self.db.query(IntentPrediction).filter(IntentPrediction.id == pred_id).first()
        self.assertIsNotNone(db_pred)
        self.assertEqual(db_pred.customer_tweet, payload["customer_tweet"])
        self.assertIsNotNone(db_pred.generated_reply)


if __name__ == "__main__":
    unittest.main()
