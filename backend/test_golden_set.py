import os
import unittest
import csv
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, ensure_schema_columns
from app.models import Conversation, GoldenSetSample
from app.services.golden_set import golden_set_service

class TestGoldenSetAnnotation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        ensure_schema_columns()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_sample_generation_and_status(self):
        """Verify sampling exactly 200 conversations and status calculation."""
        response = self.client.get("/api/golden-set/items")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["total_samples"], 200)
        self.assertEqual(len(data["items"]), 200)
        self.assertEqual(len(data["available_intents"]), 8)
        self.assertIn("annotated_count", data)
        self.assertIn("remaining_count", data)
        self.assertIn("progress_pct", data)

        # Check sample structure
        first_item = data["items"][0]
        self.assertEqual(first_item["sample_order"], 1)
        self.assertIsNotNone(first_item["conversation_id"])
        self.assertIsNotNone(first_item["customer_tweet"])
        self.assertIn("suggested_intent", first_item)
        self.assertIn("true_intent", first_item)

    def test_02_annotate_and_save_true_intent(self):
        """Verify selecting true_intent updates database conversations.true_intent."""
        # Get first sample
        items_resp = self.client.get("/api/golden-set/items")
        data = items_resp.json()
        target_conv_id = data["items"][0]["conversation_id"]
        chosen_intent = "Billing, Subscriptions & Refund Inquiries"

        # Annotate
        ann_resp = self.client.post("/api/golden-set/annotate", json={
            "conversation_id": target_conv_id,
            "true_intent": chosen_intent
        })
        self.assertEqual(ann_resp.status_code, 200)
        ann_data = ann_resp.json()
        self.assertTrue(ann_data["success"])
        self.assertEqual(ann_data["true_intent"], chosen_intent)
        self.assertGreaterEqual(ann_data["annotated_count"], 1)

        # Verify directly in database
        conv = self.db.query(Conversation).filter(Conversation.conversation_id == target_conv_id).first()
        self.assertIsNotNone(conv)
        self.assertEqual(conv.true_intent, chosen_intent)

    def test_03_export_golden_set_csv(self):
        """Verify exporting golden_set.csv and schema verification."""
        resp = self.client.get("/api/golden-set/export-csv")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("content-type"), "text/csv; charset=utf-8")

        # Verify generated CSV file on disk
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(backend_dir, "data", "golden_set.csv")
        self.assertTrue(os.path.exists(csv_path))

        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = list(csv.DictReader(f))
            self.assertEqual(len(reader), 200)
            headers = list(reader[0].keys())
            self.assertIn("sample_number", headers)
            self.assertIn("conversation_id", headers)
            self.assertIn("customer_tweet", headers)
            self.assertIn("suggested_intent", headers)
            self.assertIn("true_intent", headers)

if __name__ == "__main__":
    unittest.main()
