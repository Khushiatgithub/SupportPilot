import httpx
import json

def test_full_api_suite():
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=10.0)
    
    print("1. Testing Health Endpoint...")
    res = client.get("/api/health")
    assert res.status_code == 200
    print("   ✅ Health response:", res.json())

    print("2. Testing Inbox Stats Endpoint...")
    res = client.get("/api/tickets/stats")
    assert res.status_code == 200
    print("   ✅ Inbox stats:", res.json())

    print("3. Testing List Tickets Endpoint...")
    res = client.get("/api/tickets")
    assert res.status_code == 200
    tickets = res.json()
    print(f"   ✅ Fetched {len(tickets)} tickets successfully")
    assert len(tickets) > 0
    sample_id = tickets[0]["id"]

    print(f"4. Testing Single Ticket Detail (#{sample_id})...")
    res = client.get(f"/api/tickets/{sample_id}")
    assert res.status_code == 200
    t_detail = res.json()
    print(f"   ✅ Ticket #{sample_id} Intent: {t_detail['intent']} | Status: {t_detail['status']}")

    print("5. Testing Real-time Classification Sandbox Endpoint...")
    payload = {
        "tweet_text": "I was charged $150 twice on invoice #INV-99381 today! Please reverse this charge immediately.",
        "author_handle": "@test_customer",
        "follower_count": 450,
        "is_verified": False,
        "custom_tone": "Empathetic & Solution-Oriented"
    }
    res = client.post("/api/classify", json=payload)
    assert res.status_code == 200
    data = res.json()
    print(f"   ✅ Classification Sandbox result: Intent={data['intent']} (Confidence={data['intent_confidence']*100:.1f}%) | Decision={data['decision']}")
    print(f"   ✅ Generated Reply: \"{data['draft_reply']}\"")
    print(f"   ✅ Execution Trace Steps: {len(data['execution_trace'])} steps executed in {data['handling_time_ms']}ms")

    print("6. Testing Evaluation Benchmark Endpoint (/api/evaluation/latest)...")
    res = client.get("/api/evaluation/latest")
    assert res.status_code == 200
    eval_data = res.json()
    print(f"   ✅ Accuracy: {eval_data['accuracy']*100:.1f}% | Macro F1: {eval_data['f1_macro']*100:.1f}%")
    print(f"   ✅ Confusion Matrix Labels: {len(eval_data['confusion_matrix']['labels'])} classes")
    print(f"   ✅ Misclassified Samples: {len(eval_data['misclassified_samples'])}")

    print("7. Testing Knowledge Base Endpoint (/api/knowledge-base)...")
    res = client.get("/api/knowledge-base")
    assert res.status_code == 200
    kb = res.json()
    print(f"   ✅ Knowledge Base records count: {len(kb)}")

    print("8. Testing Brand Settings Endpoint (/api/settings)...")
    res = client.get("/api/settings")
    assert res.status_code == 200
    settings = res.json()
    print(f"   ✅ Brand Name: {settings['brand_name']} | Handle: {settings['brand_handle']} | Threshold: {settings['auto_handle_threshold']*100:.0f}%")

    print("9. Testing Frontend Root URL (http://localhost:5173)...")
    fe_client = httpx.Client(timeout=10.0)
    res_fe = fe_client.get("http://localhost:5173")
    assert res_fe.status_code == 200
    print(f"   ✅ Frontend served HTML successfully (Status {res_fe.status_code}, {len(res_fe.text)} bytes)")

    print("\n🎉 ALL FULL-STACK API & UI ENDPOINTS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_api_suite()
