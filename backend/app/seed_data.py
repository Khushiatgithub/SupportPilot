import datetime
import json
import random
from sqlalchemy.orm import Session
from .models import Tweet, Ticket, HistoricalConversation, EvaluationBenchmark, BrandSettings
from .services.intent_classifier import intent_classifier
from .services.sentiment_analyzer import sentiment_analyzer
from .services.decision_engine import decision_engine
from .services.reply_generator import reply_generator
from .services.rag_service import rag_service
from .services.evaluator import evaluator_service

SEED_HISTORICAL_CONVERSATIONS = [
    # BILLING_REFUND
    {
        "brand": "Hiver",
        "customer_handle": "@sarah_devops",
        "incoming_tweet": "Why was my company card billed twice for our monthly Hiver shared inbox plan?",
        "agent_reply": "@sarah_devops Hi Sarah! So sorry for the confusion with the duplicate billing. Please DM us your registered work email and invoice ID, and our billing lead will refund the extra charge immediately.",
        "intent": "BILLING_REFUND",
        "quality_score": 0.98,
        "category": "Billing"
    },
    {
        "brand": "Hiver",
        "customer_handle": "@alex_finance",
        "incoming_tweet": "Where can I download our annual VAT invoice for accounting tax filing?",
        "agent_reply": "@alex_finance Hi Alex! You can download all past invoices and VAT receipts directly from Settings > Billing > Invoices in your Hiver admin console. Let us know via DM if you need a customized breakdown.",
        "intent": "BILLING_REFUND",
        "quality_score": 0.96,
        "category": "Billing"
    },
    {
        "brand": "AmazonHelp",
        "customer_handle": "@john_shopper",
        "incoming_tweet": "I requested a return refund on order #112-99821 4 days ago, when will the refund reflect?",
        "agent_reply": "@john_shopper Hi John, refunds typically take 3-5 business days to post to your original payment method once the return is scanned. Please DM us your order ID if you'd like us to track the status.",
        "intent": "BILLING_REFUND",
        "quality_score": 0.95,
        "category": "Billing"
    },

    # TECHNICAL_ISSUE
    {
        "brand": "Hiver",
        "customer_handle": "@mike_support_lead",
        "incoming_tweet": "Is Hiver having an outage? Emails are not syncing in our shared mailbox right now.",
        "agent_reply": "@mike_support_lead Hi Mike, our engineers have identified a minor sync delay and deployed a hotfix. Services are recovering. You can monitor real-time status at status.hiverhq.com or DM us if you experience any lag.",
        "intent": "TECHNICAL_ISSUE",
        "quality_score": 0.99,
        "category": "Engineering"
    },
    {
        "brand": "Hiver",
        "customer_handle": "@laura_pm",
        "incoming_tweet": "The Chrome extension keeps asking for re-authentication every 10 minutes.",
        "agent_reply": "@laura_pm Hi Laura, sorry about that! Please ensure your extension is updated to v4.2.1 and clear browser cache. If the loop persists, DM us your Chrome version and we'll troubleshoot directly.",
        "intent": "TECHNICAL_ISSUE",
        "quality_score": 0.94,
        "category": "Engineering"
    },
    {
        "brand": "SpotifyCares",
        "customer_handle": "@music_fanatic",
        "incoming_tweet": "Web player throws error 500 when playing my liked songs playlist.",
        "agent_reply": "@music_fanatic Hey there! Could you try opening an incognito window or logging out and back in? If that doesn't fix it, send us a DM with your device and browser details so we can investigate.",
        "intent": "TECHNICAL_ISSUE",
        "quality_score": 0.93,
        "category": "Engineering"
    },

    # ACCOUNT_ACCESS
    {
        "brand": "Hiver",
        "customer_handle": "@security_dave",
        "incoming_tweet": "Lost access to our admin Google Authenticator 2FA. How do we recover the account?",
        "agent_reply": "@security_dave Hi Dave, security is our top priority. Please DM us your corporate domain and registered owner email so our verification team can conduct identity verification and reset your 2FA token.",
        "intent": "ACCOUNT_ACCESS",
        "quality_score": 0.97,
        "category": "Security"
    },
    {
        "brand": "AppleSupport",
        "customer_handle": "@jenny_k",
        "incoming_tweet": "I forgot my Apple ID password and the recovery email is not arriving.",
        "agent_reply": "@jenny_k We'd be glad to help with your Apple ID. You can start account recovery directly at iforgot.apple.com or DM us if you run into any issues along the way.",
        "intent": "ACCOUNT_ACCESS",
        "quality_score": 0.95,
        "category": "Security"
    },

    # ORDER_SHIPPING
    {
        "brand": "AmazonHelp",
        "customer_handle": "@tech_buyer",
        "incoming_tweet": "Tracking number #TRK-88214 says delivered on front porch but nothing is there!",
        "agent_reply": "@tech_buyer We're so sorry to hear that! Please check around your mailbox or with neighbors. If it still hasn't turned up, send us a DM with your order details and we'll arrange a replacement or refund right away.",
        "intent": "ORDER_SHIPPING",
        "quality_score": 0.96,
        "category": "Logistics"
    },
    {
        "brand": "Uber_Support",
        "customer_handle": "@rider_sf",
        "incoming_tweet": "My delivery courier drove to the wrong building and marked food delivered.",
        "agent_reply": "@rider_sf We're very sorry for the trouble! Please send us a DM with your account phone number and order ID so we can credit your account and follow up with the delivery partner.",
        "intent": "ORDER_SHIPPING",
        "quality_score": 0.94,
        "category": "Logistics"
    },

    # FEATURE_REQUEST
    {
        "brand": "Hiver",
        "customer_handle": "@design_guru",
        "incoming_tweet": "Any plans to release a dark mode theme for the Hiver dashboard?",
        "agent_reply": "@design_guru Hi! Dark mode is currently in beta testing with our product design team and is slated for public rollout next month! Keep an eye on our changelog for the update announcement.",
        "intent": "FEATURE_REQUEST",
        "quality_score": 0.97,
        "category": "Product"
    },
    {
        "brand": "Hiver",
        "customer_handle": "@growth_hacker",
        "incoming_tweet": "Would love an integration between Hiver shared inboxes and Linear tickets!",
        "agent_reply": "@growth_hacker Thanks for the great suggestion! We've added your vote to our Linear Integration feature request board with our product management team. Appreciate the feedback!",
        "intent": "FEATURE_REQUEST",
        "quality_score": 0.96,
        "category": "Product"
    },

    # CANCELLATION_CHURN
    {
        "brand": "Hiver",
        "customer_handle": "@startup_cfo",
        "incoming_tweet": "How do I cancel our subscription before the next renewal date?",
        "agent_reply": "@startup_cfo Hi! We're sorry to see you go. Workspace admins can disable auto-renewal under Settings > Billing > Manage Plan. Please DM us if you'd like help or want to share any feedback on how we can improve.",
        "intent": "CANCELLATION_CHURN",
        "quality_score": 0.95,
        "category": "Retention"
    },

    # ESCALATION_COMPLAINT
    {
        "brand": "Hiver",
        "customer_handle": "@angry_enterprise",
        "incoming_tweet": "I have been waiting 5 days for tier-3 support to answer ticket #9021. Unacceptable!",
        "agent_reply": "@angry_enterprise We sincerely apologize for the delay, this is not the level of service we strive for. Our Head of Customer Success has taken ownership of ticket #9021 and will reach out to you within 30 minutes.",
        "intent": "ESCALATION_COMPLAINT",
        "quality_score": 0.98,
        "category": "Executive"
    },

    # GENERAL_INQUIRY
    {
        "brand": "Hiver",
        "customer_handle": "@curious_founder",
        "incoming_tweet": "Does Hiver support multi-brand shared email inboxes within a single account?",
        "agent_reply": "@curious_founder Hi! Yes, Hiver allows you to manage unlimited shared inboxes (e.g. support@, sales@, info@) across different brands from one unified workspace. Check hiverhq.com/features or DM us for a personalized demo!",
        "intent": "GENERAL_INQUIRY",
        "quality_score": 0.98,
        "category": "General"
    }
]

SAMPLE_LIVE_TICKETS = [
    {
        "author_handle": "@techcrunch",
        "author_name": "TechCrunch Reporter",
        "content": "Hearing reports of a widespread email sync outage on @HiverHQ for European enterprises. Any official comment from your team?",
        "follower_count": 10450000,
        "is_verified": True
    },
    {
        "author_handle": "@emily_b2b",
        "author_name": "Emily Watson",
        "content": "I was charged $150 twice on invoice #INV-99381 today! Please reverse this charge immediately.",
        "follower_count": 820,
        "is_verified": False
    },
    {
        "author_handle": "@jordan_dev",
        "author_name": "Jordan Lee",
        "content": "Can we export customer satisfaction CSAT analytics to CSV or Google Sheets?",
        "follower_count": 340,
        "is_verified": False
    },
    {
        "author_handle": "@furious_customer",
        "author_name": "Marcus Stone",
        "content": "Your support is a COMPLETE SCAM. I demand to speak to a senior manager or I am hiring a lawyer to sue your company!",
        "follower_count": 410,
        "is_verified": False
    },
    {
        "author_handle": "@anna_ops",
        "author_name": "Anna Becker",
        "content": "Our team lead lost their 2FA phone and cannot log into the admin portal. Need urgent unlock assistance please.",
        "follower_count": 1200,
        "is_verified": False
    },
    {
        "author_handle": "@chris_saas",
        "author_name": "Chris Miller",
        "content": "What are your business support hours on weekends for Enterprise plan customers?",
        "follower_count": 550,
        "is_verified": False
    },
    {
        "author_handle": "@logistic_pro",
        "author_name": "David Clark",
        "content": "Where is my hardware security key order? Tracking number #TRK-49102 has been stuck in transit for 5 days.",
        "follower_count": 290,
        "is_verified": False
    },
    {
        "author_handle": "@sarah_cfo",
        "author_name": "Sarah Jenkins",
        "content": "We are evaluating switching to Front next quarter, how do we cancel our auto-renewal?",
        "follower_count": 4800,
        "is_verified": False
    },
    {
        "author_handle": "@alex_coder",
        "author_name": "Alex Rivera",
        "content": "Loving the shared inbox UI! Would be awesome if you guys could add Vim keybindings for navigation.",
        "follower_count": 1900,
        "is_verified": False
    },
    {
        "author_handle": "@elizabeth_corp",
        "author_name": "Elizabeth Hayes",
        "content": "Getting a 504 Gateway Timeout error on the analytics page right now. Is the server down?",
        "follower_count": 310,
        "is_verified": False
    }
]

def seed_database(db: Session):
    """Populates database with initial brand settings, historical RAG knowledge base, live tickets, and benchmark evaluation."""
    
    # 1. Brand Settings
    brand_settings = db.query(BrandSettings).first()
    if not brand_settings:
        brand_settings = BrandSettings(
            brand_name="Hiver",
            brand_handle="@HiverHQ",
            default_tone="Empathetic & Solution-Oriented",
            auto_handle_threshold=0.80,
            escalation_sentiment_threshold=-0.45,
            refund_amount_limit=100.0,
            vip_handles_json=json.dumps(["@techcrunch", "@verge", "@forbes", "@paulg", "@hiver_vip"]),
            banned_keywords_json=json.dumps(["sue", "lawsuit", "lawyer", "attorney", "regulator", "fraud", "police", "fbi", "stolen", "hacked"]),
            escalation_rules_json=json.dumps({
                "high_urgency_escalate": True,
                "negative_sentiment_escalate": True,
                "vip_escalate": True,
                "low_confidence_escalate": True,
                "banned_keywords_escalate": True
            }),
            auto_reply_enabled=True
        )
        db.add(brand_settings)
        db.commit()
        db.refresh(brand_settings)

    # 2. Historical Conversations (Knowledge Base for RAG)
    if db.query(HistoricalConversation).count() == 0:
        for item in SEED_HISTORICAL_CONVERSATIONS:
            conv = HistoricalConversation(
                brand=item.get("brand", "Hiver"),
                customer_handle=item.get("customer_handle", "@customer"),
                incoming_tweet=item["incoming_tweet"],
                agent_reply=item["agent_reply"],
                intent=item["intent"],
                quality_score=item.get("quality_score", 0.95),
                category=item.get("category", "Support"),
                is_seed=True
            )
            db.add(conv)
        db.commit()

    # Index RAG corpus in memory
    all_convs = db.query(HistoricalConversation).all()
    rag_service.index_conversations(all_convs)

    # 3. Initial Sample Live Tickets
    if db.query(Tweet).count() == 0:
        for idx, item in enumerate(SAMPLE_LIVE_TICKETS):
            tweet_uid = f"tw_{1000 + idx}"
            tweet = Tweet(
                tweet_id=tweet_uid,
                author_handle=item["author_handle"],
                author_name=item["author_name"],
                content=item["content"],
                follower_count=item["follower_count"],
                is_verified=item["is_verified"],
                created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=idx * 18)
            )
            db.add(tweet)
            db.flush()

            # Classify & triage
            pred_intent, conf, prob_dict, sub_intent, entities = intent_classifier.predict(item["content"])
            sent_score, sent_label, urg_score, risk_score = sentiment_analyzer.analyze(item["content"])
            
            # Retrieve RAG matches
            rag_matches = rag_service.search_similar(item["content"], top_k=2, intent_filter=pred_intent)

            # Evaluate decision
            decision, is_esc, reasons, calc_risk = decision_engine.evaluate(
                tweet_text=item["content"],
                author_handle=item["author_handle"],
                follower_count=item["follower_count"],
                is_verified=item["is_verified"],
                intent=pred_intent,
                confidence=conf,
                sentiment_score=sent_score,
                sentiment_label=sent_label,
                urgency_score=urg_score,
                risk_score=risk_score,
                entities=entities,
                brand_settings=brand_settings
            )

            # Generate reply draft
            draft_reply = reply_generator._generate_fallback_reply(
                tweet_text=item["content"],
                author_handle=item["author_handle"],
                intent=pred_intent,
                sub_intent=sub_intent,
                tone=brand_settings.default_tone,
                brand_name=brand_settings.brand_name,
                brand_handle=brand_settings.brand_handle,
                historical_matches=rag_matches,
                entities=entities
            )

            status = "ESCALATED" if is_esc else "AUTO_HANDLED"
            final_reply = draft_reply if not is_esc else ""

            ticket = Ticket(
                tweet_id=tweet.id,
                intent=pred_intent,
                sub_intent=sub_intent,
                intent_confidence=conf,
                sentiment_score=sent_score,
                sentiment_label=sent_label,
                urgency_score=urg_score,
                risk_score=calc_risk,
                status=status,
                is_escalated=is_esc,
                is_auto_handled=(not is_esc),
                escalation_reasons=json.dumps(reasons),
                drafted_reply=draft_reply,
                final_reply=final_reply,
                response_tone=brand_settings.default_tone,
                matched_precedents=json.dumps(rag_matches),
                handling_time_ms=random.randint(180, 450),
                created_at=tweet.created_at
            )
            db.add(ticket)
        db.commit()

    # 4. Evaluation Benchmark Run
    if db.query(EvaluationBenchmark).count() == 0:
        report = evaluator_service.run_benchmark(brand_settings)
        eval_run = EvaluationBenchmark(
            name="Baseline Zero-Shot + RAG Triage Evaluation",
            model_type=report["model_type"],
            sample_size=report["sample_size"],
            accuracy=report["accuracy"],
            precision_macro=report["precision_macro"],
            recall_macro=report["recall_macro"],
            f1_macro=report["f1_macro"],
            auto_handle_rate=report["auto_handle_rate"],
            escalation_precision=report["escalation_precision"],
            false_auto_resolve_rate=report["false_auto_resolve_rate"],
            avg_latency_ms=report["avg_latency_ms"],
            confusion_matrix_json=json.dumps(report["confusion_matrix"]),
            per_class_metrics_json=json.dumps(report["per_class_metrics"]),
            misclassified_samples_json=json.dumps(report["misclassified_samples"]),
            created_at=datetime.datetime.utcnow()
        )
        db.add(eval_run)
        db.commit()
