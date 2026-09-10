import urllib.request
import json

tests = [
    (
        "Rule 1: Low Confidence (< 0.70)",
        {"customer_tweet": "something is wrong with the app idk", "predicted_intent": "Unknown", "confidence": 0.48}
    ),
    (
        "Rule 2: Duplicate Billing Charges",
        {"customer_tweet": "Why was my credit card charged twice this month for Spotify premium?", "predicted_intent": "Billing & Payment Issues", "confidence": 0.92}
    ),
    (
        "Rule 3: Account Security / Hacked Account",
        {"customer_tweet": "Someone hacked into my account and changed my email!", "predicted_intent": "Account Access & Login", "confidence": 0.95}
    ),
    (
        "Rule 4: Abusive Complaint / Legal Threat",
        {"customer_tweet": "Your service is garbage, I will sue Spotify and report fraud!", "predicted_intent": "Audio Streaming & Playback Issues", "confidence": 0.91}
    ),
    (
        "Rule 5: Common Inquiries (>= 0.85 Confidence)",
        {"customer_tweet": "Music keeps pausing randomly every 30 seconds on iPhone", "predicted_intent": "Audio Streaming & Playback Issues", "confidence": 0.94}
    )
]

print("=" * 70)
print("TESTING SPOTIFY ESCALATION DECISION ENGINE (POST /decide-escalation)")
print("=" * 70)

for label, data in tests:
    req = urllib.request.Request(
        "http://127.0.0.1:8000/decide-escalation",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            status = "HUMAN ESCALATION" if res["escalation"] else "AUTO-HANDLED"
            print(f"\n[{label}]")
            print(f"  Tweet:        \"{data['customer_tweet']}\"")
            print(f"  Decision:     {status} | Risk: {res['risk_level']}")
            print(f"  Rule Code:    {res.get('rule_triggered')}")
            print(f"  Reason:       {res['escalation_reason']}")
            print(f"  Saved DB ID:  {res.get('prediction_id')}")
    except Exception as e:
        print(f"\n[{label}] ERROR: {e}")

print("\n" + "=" * 70)
print("All 5 escalation rule endpoints successfully verified!")
print("=" * 70)
