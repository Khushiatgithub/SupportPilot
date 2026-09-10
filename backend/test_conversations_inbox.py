import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, ensure_schema_columns
from app.models import Conversation

class TestConversationsInbox(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        ensure_schema_columns()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_inbox_data_source_and_stats(self):
        """Verify reading from 1,169 cleaned Spotify conversations with live KPIs."""
        response = self.client.get("/api/conversations/inbox?page=1&page_size=20")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["total"], 1169)
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["page_size"], 20)
        self.assertEqual(data["total_pages"], 59)
        self.assertEqual(len(data["conversations"]), 20)

        # Verify KPI counters
        stats = data["stats"]
        self.assertEqual(stats["total_tickets"], 1169)
        self.assertGreater(stats["auto_handled"], 0)
        self.assertGreater(stats["escalated"], 0)
        self.assertEqual(stats["auto_handled"] + stats["escalated"], 1169)
        self.assertEqual(stats["resolved"], 1169)
        self.assertGreater(stats["automation_rate_pct"], 0)

        # Check conversation item structure
        item = data["conversations"][0]
        self.assertIn("conversation_id", item)
        self.assertIn("customer_tweet", item)
        self.assertIn("agent_reply", item)
        self.assertIn("suggested_intent", item)
        self.assertIn("true_intent", item)
        self.assertIn("created_at", item)
        self.assertIn("status", item)
        self.assertIn("is_escalated", item)
        self.assertIn("tweet", item)

    def test_02_pagination(self):
        """Verify pagination across 1,169 conversations."""
        resp1 = self.client.get("/api/conversations/inbox?page=1&page_size=20")
        resp2 = self.client.get("/api/conversations/inbox?page=2&page_size=20")
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp2.status_code, 200)

        items1 = resp1.json()["conversations"]
        items2 = resp2.json()["conversations"]

        self.assertEqual(len(items1), 20)
        self.assertEqual(len(items2), 20)
        # Ensure page 1 and page 2 return different conversations
        self.assertNotEqual(items1[0]["conversation_id"], items2[0]["conversation_id"])

    def test_03_status_and_intent_filters(self):
        """Verify status and intent filtering."""
        # Escalated filter
        resp_esc = self.client.get("/api/conversations/inbox?status=ESCALATED&page=1&page_size=20")
        self.assertEqual(resp_esc.status_code, 200)
        esc_data = resp_esc.json()
        for item in esc_data["conversations"]:
            self.assertTrue(item["is_escalated"])

        # Search query filter
        resp_search = self.client.get("/api/conversations/inbox?search=playlist&page=1&page_size=20")
        self.assertEqual(resp_search.status_code, 200)
        search_data = resp_search.json()
        self.assertGreater(search_data["total"], 0)
        for item in search_data["conversations"]:
            self.assertTrue(
                "playlist" in item["customer_tweet"].lower() or
                "playlist" in item["agent_reply"].lower() or
                "playlist" in item["suggested_intent"].lower() or
                "playlist" in (item.get("true_intent") or "").lower()
            )

if __name__ == "__main__":
    unittest.main()
