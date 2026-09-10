#!/usr/bin/env python3
"""
Unit and Integration Tests for Production Spotify Intent Classification Module
"""

import sys
import os
import unittest
import json

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal, ensure_schema_columns
from app.models import Conversation, IntentPrediction
from app.services.intent_classifier_production import production_intent_classifier
from fastapi.testclient import TestClient
from app.main import app

class TestProductionIntentClassifier(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        ensure_schema_columns(engine)
        db = SessionLocal()
        convs_count = db.query(Conversation).filter(Conversation.brand == "Spotify").count()
        db.close()
        if convs_count < 100:
            # Ensure ingestion & discovery have run if needed
            from app.services.ingestion_pipeline import ingestion_pipeline
            from app.services.intent_discovery import intent_discovery_engine
            db = SessionLocal()
            ingestion_pipeline.run_pipeline(db=db)
            intent_discovery_engine.run_discovery(db=db)
            db.close()

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_training_and_evaluation_metrics(self):
        # Run training and evaluation
        report = production_intent_classifier.train_and_evaluate(db=self.db)

        # 1. Verify Dataset Info
        self.assertIn("dataset_info", report)
        dataset_info = report["dataset_info"]
        self.assertGreaterEqual(dataset_info["total_conversations"], 500)
        self.assertIn("80% Train / 20% Test", dataset_info["split_ratio"])
        self.assertEqual(dataset_info["num_classes"], 8)

        # 2. Verify Baseline Model Metrics (TF-IDF + Logistic Regression)
        self.assertIn("baseline_model", report)
        baseline = report["baseline_model"]
        self.assertIn("accuracy", baseline)
        self.assertIn("macro_precision", baseline)
        self.assertIn("macro_recall", baseline)
        self.assertIn("macro_f1", baseline)
        self.assertIn("confusion_matrix", baseline)
        self.assertGreater(baseline["accuracy"], 0.70)
        self.assertGreater(baseline["macro_f1"], 0.70)
        self.assertEqual(len(baseline["confusion_matrix"]), 8)

        # 3. Verify Final Model Metrics (Sentence Embeddings + Nearest Centroid)
        self.assertIn("final_model", report)
        final = report["final_model"]
        self.assertIn("accuracy", final)
        self.assertIn("macro_precision", final)
        self.assertIn("macro_recall", final)
        self.assertIn("macro_f1", final)
        self.assertIn("confusion_matrix", final)
        self.assertIn("per_intent_table", final)
        self.assertGreater(final["accuracy"], 0.70)
        self.assertGreater(final["macro_f1"], 0.70)
        self.assertEqual(len(final["confusion_matrix"]), 8)
        self.assertEqual(len(final["per_intent_table"]), 8)

        # Verify Per-Intent breakdown fields
        for row in final["per_intent_table"]:
            self.assertIn("intent_name", row)
            self.assertIn("precision", row)
            self.assertIn("recall", row)
            self.assertIn("f1_score", row)
            self.assertIn("support", row)
            self.assertGreater(row["support"], 0)

    def test_predict_and_persistence(self):
        # Test direct predict call
        query = "My premium subscription charge was debited twice ($14.99 x 2). Need a refund."
        res = production_intent_classifier.predict(query, db=self.db, save_prediction=True)

        self.assertIn("predicted_intent", res)
        self.assertIn("confidence", res)
        self.assertIn("top_3_intents", res)
        self.assertIn("latency_ms", res)
        self.assertGreaterEqual(res["confidence"], 0.0)
        self.assertLessEqual(res["confidence"], 1.0)
        self.assertEqual(len(res["top_3_intents"]), 3)
        self.assertGreater(res["latency_ms"], 0.0)

        # Verify prediction is saved in predictions table
        saved = (
            self.db.query(IntentPrediction)
            .filter(IntentPrediction.customer_tweet == query)
            .first()
        )
        self.assertIsNotNone(saved, "Prediction was not persisted in database")
        self.assertEqual(saved.predicted_intent, res["predicted_intent"])

    def test_api_predict_and_eval_endpoints(self):
        client = TestClient(app)

        # 1. Test POST /predict-intent (root endpoint)
        payload = {"customer_tweet": "My offline songs are greyed out on airplane flight mode"}
        res = client.post("/predict-intent", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("predicted_intent", data)
        self.assertIn("confidence", data)
        self.assertIn("top_3_intents", data)
        self.assertIn("latency_ms", data)
        self.assertEqual(len(data["top_3_intents"]), 3)

        # 2. Test POST /api/predict-intent (API prefixed endpoint)
        res_api = client.post("/api/predict-intent", json=payload)
        self.assertEqual(res_api.status_code, 200)

        # 3. Test GET /api/classifier/evaluation
        res_eval = client.get("/api/classifier/evaluation")
        self.assertEqual(res_eval.status_code, 200)
        eval_data = res_eval.json()
        self.assertIn("baseline_model", eval_data)
        self.assertIn("final_model", eval_data)
        self.assertIn("accuracy", eval_data["final_model"])

        # 4. Test GET /api/classifier/predictions
        res_preds = client.get("/api/classifier/predictions?limit=10")
        self.assertEqual(res_preds.status_code, 200)
        preds_data = res_preds.json()
        self.assertIn("total", preds_data)
        self.assertIn("predictions", preds_data)
        self.assertGreater(len(preds_data["predictions"]), 0)

if __name__ == "__main__":
    unittest.main()
