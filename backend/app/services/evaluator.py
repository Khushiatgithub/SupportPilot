import time
import json
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support, accuracy_score
from .intent_classifier import intent_classifier, INTENT_LABELS, INTENT_DISPLAY_NAMES
from .sentiment_analyzer import sentiment_analyzer
from .decision_engine import decision_engine
from ..models import BrandSettings, EvaluationBenchmark
from ..database import SessionLocal

# Standard Benchmark Dataset with ground-truth labels for 8 classes + edge cases
BENCHMARK_TEST_DATASET = [
    # BILLING_REFUND (12 samples)
    {"text": "Why was I charged $49.99 after cancelling my free trial?", "label": "BILLING_REFUND"},
    {"text": "Can you please issue a refund for invoice #INV-88392? We didn't use the service.", "label": "BILLING_REFUND"},
    {"text": "There is an unknown recurring charge of $29 from Hiver on my credit card statement.", "label": "BILLING_REFUND"},
    {"text": "My payment via Stripe keeps failing with card declined error code 200.", "label": "BILLING_REFUND"},
    {"text": "We need our VAT tax invoice for accounting compliance.", "label": "BILLING_REFUND"},
    {"text": "I was billed twice for the annual growth tier today! Please reverse the duplicate charge.", "label": "BILLING_REFUND"},
    {"text": "How do I switch our billing currency from USD to EUR?", "label": "BILLING_REFUND"},
    {"text": "Refund request for order #39103 - the product arrived damaged.", "label": "BILLING_REFUND"},
    {"text": "Where can I download receipts for past payments?", "label": "BILLING_REFUND"},
    {"text": "My card expired and I need to update payment details before my workspace locks.", "label": "BILLING_REFUND"},
    {"text": "Overcharged by $120 on our monthly seat expansion.", "label": "BILLING_REFUND"},
    {"text": "Still waiting for my $75 refund approved two weeks ago.", "label": "BILLING_REFUND"},

    # TECHNICAL_ISSUE (12 samples)
    {"text": "The web app is showing 500 internal server error for our whole team!", "label": "TECHNICAL_ISSUE"},
    {"text": "Is Hiver down right now? We cannot access our shared mailbox.", "label": "TECHNICAL_ISSUE"},
    {"text": "Mobile app crashes whenever I try to attach a PDF document.", "label": "TECHNICAL_ISSUE"},
    {"text": "Gmail sync has stopped updating emails since 9 AM this morning.", "label": "TECHNICAL_ISSUE"},
    {"text": "Getting a 504 Gateway Timeout when opening analytics dashboard.", "label": "TECHNICAL_ISSUE"},
    {"text": "There's a UI glitch where assignment tags duplicate on click.", "label": "TECHNICAL_ISSUE"},
    {"text": "Console error: Uncaught TypeError in main.bundle.js preventing login.", "label": "TECHNICAL_ISSUE"},
    {"text": "Search queries are returning zero results even for exact match subject lines.", "label": "TECHNICAL_ISSUE"},
    {"text": "Webhooks are failing to deliver JSON payloads to our endpoint.", "label": "TECHNICAL_ISSUE"},
    {"text": "The Chrome extension keeps disconnecting and requiring re-login.", "label": "TECHNICAL_ISSUE"},
    {"text": "Massive latency across all ticket loading screens today.", "label": "TECHNICAL_ISSUE"},
    {"text": "Email templates are rendering broken HTML code in outgoing drafts.", "label": "TECHNICAL_ISSUE"},

    # ACCOUNT_ACCESS (12 samples)
    {"text": "I lost my 2FA phone and cannot log into my support admin account.", "label": "ACCOUNT_ACCESS"},
    {"text": "Password reset email is not coming through to my inbox.", "label": "ACCOUNT_ACCESS"},
    {"text": "My account has been locked due to too many failed attempts.", "label": "ACCOUNT_ACCESS"},
    {"text": "How do I change the owner email of our company workspace?", "label": "ACCOUNT_ACCESS"},
    {"text": "Need help setting up SAML Single Sign-On (SSO) with Okta.", "label": "ACCOUNT_ACCESS"},
    {"text": "Suspicious login attempt detected from Russia on my account, please lock it.", "label": "ACCOUNT_ACCESS"},
    {"text": "The verification SMS code is never received on my mobile number.", "label": "ACCOUNT_ACCESS"},
    {"text": "How do I revoke API keys and session tokens for a departed employee?", "label": "ACCOUNT_ACCESS"},
    {"text": "Cannot invite new team members, says user limit reached.", "label": "ACCOUNT_ACCESS"},
    {"text": "How can I enable Google Workspace OAuth authentication?", "label": "ACCOUNT_ACCESS"},
    {"text": "Locked out of my profile after updating my password yesterday.", "label": "ACCOUNT_ACCESS"},
    {"text": "Reset link expired error when clicking the email button.", "label": "ACCOUNT_ACCESS"},

    # ORDER_SHIPPING (12 samples)
    {"text": "Where is my package? Tracking #TRK-9921 shows no movement for 6 days.", "label": "ORDER_SHIPPING"},
    {"text": "Package says delivered on porch but nothing is there!", "label": "ORDER_SHIPPING"},
    {"text": "Received the wrong hardware model in our office shipment.", "label": "ORDER_SHIPPING"},
    {"text": "The box arrived torn and the items inside are completely broken.", "label": "ORDER_SHIPPING"},
    {"text": "Can I change my delivery shipping address before dispatch?", "label": "ORDER_SHIPPING"},
    {"text": "Customs clearance delay for international courier package.", "label": "ORDER_SHIPPING"},
    {"text": "Need expedited overnight courier for my replacement order.", "label": "ORDER_SHIPPING"},
    {"text": "FedEx returned package to sender saying address was incomplete.", "label": "ORDER_SHIPPING"},
    {"text": "Tracking link is giving a 404 page on the logistics portal.", "label": "ORDER_SHIPPING"},
    {"text": "When will preorder batch #4 be dispatched from warehouse?", "label": "ORDER_SHIPPING"},
    {"text": "Missing 2 units from shipment #SHP-40192.", "label": "ORDER_SHIPPING"},
    {"text": "Delivery driver marked failed attempt but no one rang the bell.", "label": "ORDER_SHIPPING"},

    # FEATURE_REQUEST (12 samples)
    {"text": "Can you please add dark mode support to the desktop application?", "label": "FEATURE_REQUEST"},
    {"text": "It would be great to integrate directly with Jira and Linear tickets.", "label": "FEATURE_REQUEST"},
    {"text": "Feature request: automated ticket assignment based on agent workload.", "label": "FEATURE_REQUEST"},
    {"text": "Please allow exporting reports directly to Google Sheets or Excel.", "label": "FEATURE_REQUEST"},
    {"text": "Are there plans to support WhatsApp Business and Instagram DMs?", "label": "FEATURE_REQUEST"},
    {"text": "Can we get custom keyboard shortcuts for quick macro execution?", "label": "FEATURE_REQUEST"},
    {"text": "Wishlist: auto-translate customer incoming emails into English.", "label": "FEATURE_REQUEST"},
    {"text": "Please add custom SLA breach alerts to Slack channels.", "label": "FEATURE_REQUEST"},
    {"text": "Would love an option to schedule emails to be sent at a future time.", "label": "FEATURE_REQUEST"},
    {"text": "Can we have custom emoji reactions in internal customer notes?", "label": "FEATURE_REQUEST"},
    {"text": "Feature request: audio transcription for customer voice messages.", "label": "FEATURE_REQUEST"},
    {"text": "Please build a native iPad and tablet optimized interface.", "label": "FEATURE_REQUEST"},

    # CANCELLATION_CHURN (12 samples)
    {"text": "I want to cancel my subscription and get confirmation of cancellation.", "label": "CANCELLATION_CHURN"},
    {"text": "We are switching to Zendesk next month, please close our account.", "label": "CANCELLATION_CHURN"},
    {"text": "How do I delete all our company data and terminate the workspace?", "label": "CANCELLATION_CHURN"},
    {"text": "Please disable auto-renewal on our annual contract.", "label": "CANCELLATION_CHURN"},
    {"text": "Unsubscribe our organization immediately, we are not renewing.", "label": "CANCELLATION_CHURN"},
    {"text": "Downgrade our team from Enterprise tier to Starter tier.", "label": "CANCELLATION_CHURN"},
    {"text": "Closing our startup so we need to shut down our subscription today.", "label": "CANCELLATION_CHURN"},
    {"text": "Your tool is too expensive compared to Freshdesk, cancel our plan.", "label": "CANCELLATION_CHURN"},
    {"text": "Please stop charging us, we stopped using the platform 2 months ago.", "label": "CANCELLATION_CHURN"},
    {"text": "How to terminate contract before next billing cycle?", "label": "CANCELLATION_CHURN"},
    {"text": "We found an alternative solution and want to cancel today.", "label": "CANCELLATION_CHURN"},
    {"text": "End trial immediately and purge our account details.", "label": "CANCELLATION_CHURN"},

    # ESCALATION_COMPLAINT (12 samples)
    {"text": "I demand to speak to a senior manager or VP of customer support right now!", "label": "ESCALATION_COMPLAINT"},
    {"text": "Your support team is totally useless and gave me wrong instructions twice.", "label": "ESCALATION_COMPLAINT"},
    {"text": "This company is a scam. I will file a formal complaint with FTC and my lawyer.", "label": "ESCALATION_COMPLAINT"},
    {"text": "Horrible, unacceptable service! You cost my business thousands today.", "label": "ESCALATION_COMPLAINT"},
    {"text": "If this is not fixed in 1 hour we are taking immediate legal action.", "label": "ESCALATION_COMPLAINT"},
    {"text": "Your representative was incredibly rude and closed my ticket without helping.", "label": "ESCALATION_COMPLAINT"},
    {"text": "Worst experience ever. 4 weeks waiting for a basic answer.", "label": "ESCALATION_COMPLAINT"},
    {"text": "Escalating this publicly on Twitter/X because your email team ignores me.", "label": "ESCALATION_COMPLAINT"},
    {"text": "Total breach of contract. I want an explanation from your CEO.", "label": "ESCALATION_COMPLAINT"},
    {"text": "Disgusted by how your agents treat paying customers.", "label": "ESCALATION_COMPLAINT"},
    {"text": "You are holding our data hostage, we will report to authorities.", "label": "ESCALATION_COMPLAINT"},
    {"text": "Manager escalation required immediately regarding severe agent incompetence.", "label": "ESCALATION_COMPLAINT"},

    # GENERAL_INQUIRY (12 samples)
    {"text": "What are your customer support working hours across timezones?", "label": "GENERAL_INQUIRY"},
    {"text": "Can someone explain the difference between the Growth and Pro plans?", "label": "GENERAL_INQUIRY"},
    {"text": "Where can I read your technical documentation and API reference?", "label": "GENERAL_INQUIRY"},
    {"text": "Do you offer a discount for non-profit charities or students?", "label": "GENERAL_INQUIRY"},
    {"text": "Is Hiver SOC2 Type II certified and GDPR compliant?", "label": "GENERAL_INQUIRY"},
    {"text": "Can I book a 20-minute product demo for our executive team?", "label": "GENERAL_INQUIRY"},
    {"text": "How many users are included in the base pricing tier?", "label": "GENERAL_INQUIRY"},
    {"text": "Do you support integration with Google Workspace or Microsoft 365?", "label": "GENERAL_INQUIRY"},
    {"text": "What is your typical SLA response time for priority support?", "label": "GENERAL_INQUIRY"},
    {"text": "Where are your cloud servers and customer databases hosted?", "label": "GENERAL_INQUIRY"},
    {"text": "Is there a free trial available to test the features?", "label": "GENERAL_INQUIRY"},
    {"text": "How does the email delegation feature work in shared inboxes?", "label": "GENERAL_INQUIRY"}
]

class EvaluatorService:
    def __init__(self):
        pass

    def run_benchmark(self, brand_settings: BrandSettings = None) -> Dict[str, Any]:
        """
        Executes benchmark evaluation on the test dataset and generates
        Confusion Matrix, Precision/Recall/F1, and Safety & Automation metrics.
        """
        if brand_settings is None:
            brand_settings = BrandSettings()

        y_true = []
        y_pred = []
        latencies = []
        misclassified = []
        
        auto_handled_count = 0
        escalated_count = 0
        valid_escalations = 0
        false_auto_resolves = 0

        for idx, item in enumerate(BENCHMARK_TEST_DATASET):
            text = item["text"]
            true_label = item["label"]
            
            start_t = time.perf_counter()
            pred_intent, conf, prob_dict, sub_intent, entities = intent_classifier.predict(text)
            sentiment_score, sentiment_label, urgency_score, risk_score = sentiment_analyzer.analyze(text)
            
            decision, is_escalated, reasons, calc_risk = decision_engine.evaluate(
                tweet_text=text,
                author_handle="@test_evaluator",
                follower_count=350,
                is_verified=False,
                intent=pred_intent,
                confidence=conf,
                sentiment_score=sentiment_score,
                sentiment_label=sentiment_label,
                urgency_score=urgency_score,
                risk_score=risk_score,
                entities=entities,
                brand_settings=brand_settings
            )
            elapsed_ms = (time.perf_counter() - start_t) * 1000.0
            latencies.append(elapsed_ms)
            
            y_true.append(true_label)
            y_pred.append(pred_intent)
            
            if is_escalated:
                escalated_count += 1
                if sentiment_score < -0.2 or urgency_score >= 6 or true_label in ["ESCALATION_COMPLAINT", "CANCELLATION_CHURN"]:
                    valid_escalations += 1
            else:
                auto_handled_count += 1
                if sentiment_score < -0.4 or urgency_score >= 8 or true_label == "ESCALATION_COMPLAINT":
                    false_auto_resolves += 1
                    
            if pred_intent != true_label:
                misclassified.append({
                    "id": idx + 1,
                    "tweet_text": text,
                    "actual_intent": true_label,
                    "predicted_intent": pred_intent,
                    "confidence": round(conf, 3),
                    "sentiment": sentiment_label,
                    "error_type": f"{true_label} misclassified as {pred_intent}"
                })

        # Calculate metrics with sklearn
        acc = accuracy_score(y_true, y_pred)
        precision, recall, f1, support = precision_recall_fscore_support(
            y_true, y_pred, labels=INTENT_LABELS, zero_division=0
        )
        
        macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
            y_true, y_pred, average='macro', zero_division=0
        )
        
        # Build Confusion Matrix
        cm = confusion_matrix(y_true, y_pred, labels=INTENT_LABELS)
        
        cell_details = []
        for i, actual_label in enumerate(INTENT_LABELS):
            row_total = sum(cm[i])
            for j, pred_label in enumerate(INTENT_LABELS):
                count = int(cm[i][j])
                pct = round((count / max(1, row_total)) * 100.0, 1)
                cell_details.append({
                    "actual": actual_label,
                    "predicted": pred_label,
                    "count": count,
                    "percentage": pct
                })

        per_class = []
        for idx, label in enumerate(INTENT_LABELS):
            per_class.append({
                "intent": label,
                "precision": round(float(precision[idx]), 3),
                "recall": round(float(recall[idx]), 3),
                "f1_score": round(float(f1[idx]), 3),
                "support": int(support[idx])
            })

        total_samples = len(BENCHMARK_TEST_DATASET)
        auto_rate = round(auto_handled_count / total_samples, 3)
        esc_precision = round(valid_escalations / max(1, escalated_count), 3)
        false_auto_rate = round(false_auto_resolves / max(1, auto_handled_count), 3)
        avg_lat = round(float(np.mean(latencies)), 2)

        report = {
            "name": f"Hiver Benchmark Run #{int(time.time())}",
            "model_type": "Hybrid TF-IDF + Dynamic Sentiment & RAG Triage",
            "sample_size": total_samples,
            "accuracy": round(float(acc), 4),
            "precision_macro": round(float(macro_p), 4),
            "recall_macro": round(float(macro_r), 4),
            "f1_macro": round(float(macro_f1), 4),
            "auto_handle_rate": auto_rate,
            "escalation_precision": esc_precision,
            "false_auto_resolve_rate": false_auto_rate,
            "avg_latency_ms": avg_lat,
            "confusion_matrix": {
                "labels": INTENT_LABELS,
                "matrix": cm.tolist(),
                "cell_details": cell_details
            },
            "per_class_metrics": per_class,
            "misclassified_samples": misclassified,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

        return report

evaluator_service = EvaluatorService()
