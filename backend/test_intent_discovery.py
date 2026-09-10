#!/usr/bin/env python3
"""
Unit and Integration Tests for Spotify Intent Discovery Module
"""

import sys
import os
import unittest
import csv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal, ensure_schema_columns
from app.models import Conversation, DiscoveredIntentModel
from app.services.ingestion_pipeline import ingestion_pipeline
from app.services.intent_discovery import intent_discovery_engine
from fastapi.testclient import TestClient
from app.main import app

class TestSpotifyIntentDiscovery(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        ensure_schema_columns(engine)
        db = SessionLocal()
        # Ensure database has populated Spotify conversations
        ingestion_pipeline.run_pipeline(db=db)
        db.close()

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_semantic_clustering_and_intent_generation(self):
        # Record initial true_intent values to verify they are never modified
        initial_convs = self.db.query(Conversation).filter(Conversation.brand == "Spotify").all()
        self.assertGreaterEqual(len(initial_convs), 20)
        original_true_intents = {c.conversation_id: c.true_intent for c in initial_convs}

        # Run discovery
        report = intent_discovery_engine.run_discovery(db=self.db)

        # 1. Verify 8 clusters discovered
        self.assertEqual(report["num_clusters_discovered"], 8)
        self.assertEqual(len(report["intents"]), 8)

        # 2. Verify each discovered intent properties
        discovered_names = set()
        for item in report["intents"]:
            self.assertIn("intent_name", item)
            self.assertIn("description", item)
            self.assertIn("conversation_count", item)
            self.assertIn("percentage", item)
            self.assertIn("top_keywords", item)
            self.assertIn("sample_tweets", item)

            self.assertTrue(len(item["intent_name"]) > 3)
            self.assertTrue(len(item["description"]) > 10)
            self.assertGreater(item["conversation_count"], 0)
            self.assertGreater(item["percentage"], 0.0)
            self.assertGreaterEqual(len(item["top_keywords"]), 1)
            self.assertGreaterEqual(len(item["sample_tweets"]), 1)
            discovered_names.add(item["intent_name"])

        # 3. CRITICAL: Verify true_intent was NOT overwritten
        after_convs = self.db.query(Conversation).filter(Conversation.brand == "Spotify").all()
        for c in after_convs:
            self.assertEqual(
                c.true_intent,
                original_true_intents.get(c.conversation_id),
                f"true_intent was modified for conversation {c.conversation_id}!"
            )

        # 4. CRITICAL: Verify suggested_intent was populated in the database
        for c in after_convs:
            self.assertIsNotNone(c.suggested_intent, f"suggested_intent missing for {c.conversation_id}")
            self.assertIn(c.suggested_intent, discovered_names)

        # 5. Verify intents.csv export file exists and contains 8 intent rows
        csv_path = "backend/data/intents.csv"
        self.assertTrue(os.path.exists(csv_path), "intents.csv was not created")

        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            self.assertEqual(len(rows), 8)
            first_row = rows[0]
            self.assertIn("intent_name", first_row)
            self.assertIn("description", first_row)
            self.assertIn("conversation_count", first_row)
            self.assertIn("percentage", first_row)
            self.assertIn("top_keywords", first_row)
            self.assertIn("sample_tweet_1", first_row)
            self.assertIn("sample_tweet_10", first_row)

    def test_api_endpoints(self):
        client = TestClient(app)

        # Test GET /api/intent-discovery/intents
        res = client.get("/api/intent-discovery/intents")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["num_clusters_discovered"], 8)
        self.assertEqual(len(data["intents"]), 8)

        # Test GET /api/intent-discovery/conversations
        res_convs = client.get("/api/intent-discovery/conversations?limit=10")
        self.assertEqual(res_convs.status_code, 200)
        convs_data = res_convs.json()
        self.assertIn("total", convs_data)
        self.assertIn("conversations", convs_data)
        self.assertGreater(len(convs_data["conversations"]), 0)
        sample = convs_data["conversations"][0]
        self.assertIn("conversation_id", sample)
        self.assertIn("customer_tweet", sample)
        self.assertIn("suggested_intent", sample)
        self.assertIn("true_intent", sample)

        # Test GET /api/intent-discovery/export-csv
        res_csv = client.get("/api/intent-discovery/export-csv")
        self.assertEqual(res_csv.status_code, 200)
        self.assertIn("text/csv", res_csv.headers.get("content-type", ""))
        self.assertIn("intent_name", res_csv.text)

if __name__ == "__main__":
    unittest.main()
