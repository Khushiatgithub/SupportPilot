import unittest
import os
import json
from app.database import SessionLocal, ensure_schema_columns
from app.models import LLMJudgeEvaluation
from app.services.llm_judge import spotify_llm_judge_service


class TestLLMJudgeService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_schema_columns()
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_evaluate_reply_rubric_clean(self):
        tweet = "All my offline downloaded songs were deleted after updating Spotify app."
        reply = "Hey! Check Settings > Storage > Storage location to make sure your SD Card is selected. For your security, send us a DM with your device details if you need more help!"
        retrieved_context = [
            {"agent_reply": "Hi! Check your storage settings on SD card or DM us.", "similarity_score": 0.89}
        ]
        decision = {"auto_handle": True, "escalation": False, "risk_level": "LOW", "escalation_reason": "Standard reply"}

        res = spotify_llm_judge_service.evaluate_reply_rubric(
            customer_tweet=tweet,
            generated_reply=reply,
            retrieved_context=retrieved_context,
            predicted_intent="Offline Playlists & Storage",
            escalation_decision=decision
        )

        self.assertIn("correctness", res)
        self.assertIn("groundedness", res)
        self.assertIn("empathy", res)
        self.assertIn("actionability", res)
        self.assertEqual(res["hallucination"], "PASS")
        self.assertGreaterEqual(res["correctness"], 3)
        self.assertGreaterEqual(res["empathy"], 3)

    def test_02_evaluate_reply_rubric_hallucination(self):
        tweet = "Why was I charged twice for Spotify Premium?"
        reply = "We have refunded $49.99 to your credit card right now."
        retrieved_context = [{"agent_reply": "Check receipts at spotify.com/account", "similarity_score": 0.90}]
        decision = {"auto_handle": False, "escalation": True, "risk_level": "HIGH", "escalation_reason": "Double billing"}

        res = spotify_llm_judge_service.evaluate_reply_rubric(
            customer_tweet=tweet,
            generated_reply=reply,
            retrieved_context=retrieved_context,
            predicted_intent="Billing & Payment Issues",
            escalation_decision=decision
        )

        self.assertEqual(res["hallucination"], "FAIL")

    def test_03_get_or_create_evaluation_samples(self):
        samples = spotify_llm_judge_service.get_or_create_evaluation_samples(self.db)
        self.assertEqual(len(samples), 30)

        first = samples[0]
        self.assertIsNotNone(first.customer_tweet)
        self.assertIsNotNone(first.generated_reply)
        self.assertIn(first.llm_hallucination, ["PASS", "FAIL"])
        self.assertGreaterEqual(first.llm_correctness, 1)
        self.assertLessEqual(first.llm_correctness, 5)

    def test_04_save_human_evaluation_and_metrics(self):
        status = spotify_llm_judge_service.get_status_and_samples(self.db)
        self.assertEqual(status["total_samples"], 30)
        self.assertIn("metrics", status)

        # Update sample #1 human evaluation
        update_res = spotify_llm_judge_service.save_human_evaluation(
            db=self.db,
            sample_order=1,
            correctness=5,
            groundedness=5,
            empathy=5,
            actionability=5,
            hallucination="PASS",
            notes="Excellent verified resolution."
        )
        self.assertTrue(update_res["success"])
        metrics = update_res["metrics"]
        self.assertIn("cohens_kappa", metrics)
        self.assertIn("percentage_agreement", metrics)
        self.assertIn("mean_absolute_difference", metrics)

    def test_05_export_judge_artifacts(self):
        csv_path, json_path = spotify_llm_judge_service.export_judge_artifacts(self.db)
        self.assertTrue(os.path.exists(csv_path))
        self.assertTrue(os.path.exists(json_path))
        self.assertGreater(os.path.getsize(csv_path), 500)
        self.assertGreater(os.path.getsize(json_path), 500)


if __name__ == "__main__":
    unittest.main()
