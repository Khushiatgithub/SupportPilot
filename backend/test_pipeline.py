#!/usr/bin/env python3
"""
Unit and Integration Tests for Kaggle TWCS Spotify Data Ingestion Pipeline
"""

import sys
import os
import unittest
import tempfile
import csv
from datetime import datetime

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import Conversation, IngestionReport
from app.services.ingestion_pipeline import ingestion_pipeline, parse_twitter_date, clean_tweet_text, is_deleted_or_empty
from fastapi.testclient import TestClient
from app.main import app

class TestTwcsIngestionPipeline(unittest.TestCase):

    def setUp(self):
        # Create fresh SQLite tables
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_text_cleaning_and_date_parsing(self):
        # Test text cleaning
        raw_text = "  Hello   @SpotifyCares  \r\n\n My app is broken!   "
        cleaned = clean_tweet_text(raw_text)
        self.assertEqual(cleaned, "Hello @SpotifyCares \n\n My app is broken!")

        # Test deleted detection
        self.assertTrue(is_deleted_or_empty("[deleted]"))
        self.assertTrue(is_deleted_or_empty("deleted"))
        self.assertTrue(is_deleted_or_empty("  "))
        self.assertTrue(is_deleted_or_empty("a"))
        self.assertFalse(is_deleted_or_empty("Valid tweet content"))

        # Test date parsing
        dt = parse_twitter_date("Tue Oct 31 20:11:15 +0000 2017")
        self.assertEqual(dt.year, 2017)
        self.assertEqual(dt.month, 10)
        self.assertEqual(dt.day, 31)

    def test_custom_csv_thread_reconstruction_and_cleaning(self):
        # Create a temporary custom CSV with diverse cases
        test_rows = [
            # 1. Valid Spotify Pair
            {"tweet_id": "1", "author_id": "cust1", "inbound": "True", "created_at": "Tue Oct 31 20:00:00 +0000 2017", "text": "@SpotifyCares audio glitch", "response_tweet_id": "2", "in_response_to_tweet_id": ""},
            {"tweet_id": "2", "author_id": "SpotifyCares", "inbound": "False", "created_at": "Tue Oct 31 20:05:00 +0000 2017", "text": "@cust1 restart app", "response_tweet_id": "", "in_response_to_tweet_id": "1"},

            # 2. Non-Spotify Brand (Should be filtered out)
            {"tweet_id": "3", "author_id": "AppleSupport", "inbound": "False", "created_at": "Tue Oct 31 20:10:00 +0000 2017", "text": "@apple_user reboot phone", "response_tweet_id": "", "in_response_to_tweet_id": "4"},

            # 3. Deleted customer tweet (Should be removed)
            {"tweet_id": "5", "author_id": "cust2", "inbound": "True", "created_at": "Tue Oct 31 20:15:00 +0000 2017", "text": "[deleted]", "response_tweet_id": "6", "in_response_to_tweet_id": ""},
            {"tweet_id": "6", "author_id": "SpotifyCares", "inbound": "False", "created_at": "Tue Oct 31 20:20:00 +0000 2017", "text": "@cust2 how can we help?", "response_tweet_id": "", "in_response_to_tweet_id": "5"},

            # 4. Unresolved customer tweet (No Spotify reply - Should be removed)
            {"tweet_id": "7", "author_id": "cust3", "inbound": "True", "created_at": "Tue Oct 31 20:25:00 +0000 2017", "text": "@SpotifyCares why is service down?", "response_tweet_id": "", "in_response_to_tweet_id": ""},

            # 5. Duplicate pair of #1 (Should be deduplicated)
            {"tweet_id": "8", "author_id": "cust1", "inbound": "True", "created_at": "Tue Oct 31 20:00:00 +0000 2017", "text": "@SpotifyCares audio glitch", "response_tweet_id": "9", "in_response_to_tweet_id": ""},
            {"tweet_id": "9", "author_id": "SpotifyCares", "inbound": "False", "created_at": "Tue Oct 31 20:05:00 +0000 2017", "text": "@cust1 restart app", "response_tweet_id": "", "in_response_to_tweet_id": "8"}
        ]

        with tempfile.NamedTemporaryFile(mode="w", newline="", encoding="utf-8", delete=False, suffix=".csv") as tmp:
            tmp_path = tmp.name
            writer = csv.DictWriter(tmp, fieldnames=["tweet_id", "author_id", "inbound", "created_at", "text", "response_tweet_id", "in_response_to_tweet_id"])
            writer.writeheader()
            for r in test_rows:
                writer.writerow(r)

        try:
            report = ingestion_pipeline.run_pipeline(csv_file_path=tmp_path, db=self.db)
            
            self.assertEqual(report["total_raw_rows"], 8)
            self.assertEqual(report["final_cleaned_conversations"], 1)
            self.assertEqual(report["rows_removed"], 7)
            self.assertEqual(report["percentage_retained"], 12.5)

            # Check breakdown
            breakdown = report["removed_breakdown"]
            self.assertEqual(breakdown["non_spotify_brand_rows"], 1)
            self.assertEqual(breakdown["unresolved_conversations_no_reply"], 1)
            self.assertEqual(breakdown["empty_or_deleted_messages"], 1)
            self.assertEqual(breakdown["duplicate_threads"], 1)

            # Check database insertion
            saved_conv = self.db.query(Conversation).filter(Conversation.conversation_id == "twcs_1").first()
            self.assertIsNotNone(saved_conv)
            self.assertEqual(saved_conv.brand, "Spotify")
            self.assertEqual(saved_conv.customer_tweet, "@SpotifyCares audio glitch")
            self.assertEqual(saved_conv.agent_reply, "@cust1 restart app")
            self.assertTrue(saved_conv.is_customer)

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_api_pipeline_endpoints(self):
        client = TestClient(app)
        
        # Test GET report
        res_report = client.get("/api/pipeline/report")
        self.assertEqual(res_report.status_code, 200)
        data = res_report.json()
        self.assertIn("total_raw_rows", data)
        self.assertIn("final_cleaned_conversations", data)
        self.assertIn("preview_conversations", data)
        self.assertGreaterEqual(len(data["preview_conversations"]), 1)

        # Test GET preview
        res_preview = client.get("/api/pipeline/preview?limit=20")
        self.assertEqual(res_preview.status_code, 200)
        preview_list = res_preview.json()
        self.assertIsInstance(preview_list, list)
        self.assertLessEqual(len(preview_list), 20)
        first_item = preview_list[0]
        self.assertIn("conversation_id", first_item)
        self.assertIn("customer_tweet", first_item)
        self.assertIn("agent_reply", first_item)
        self.assertIn("brand", first_item)
        self.assertEqual(first_item["brand"], "Spotify")

if __name__ == "__main__":
    unittest.main()
