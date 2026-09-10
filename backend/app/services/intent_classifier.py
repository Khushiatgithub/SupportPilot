import re
import numpy as np
from typing import Dict, List, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

INTENT_LABELS = [
    "BILLING_REFUND",
    "TECHNICAL_ISSUE",
    "ACCOUNT_ACCESS",
    "ORDER_SHIPPING",
    "FEATURE_REQUEST",
    "CANCELLATION_CHURN",
    "ESCALATION_COMPLAINT",
    "GENERAL_INQUIRY"
]

INTENT_DISPLAY_NAMES = {
    "BILLING_REFUND": "Billing & Refunds",
    "TECHNICAL_ISSUE": "Technical Issues & Outages",
    "ACCOUNT_ACCESS": "Account Access & Security",
    "ORDER_SHIPPING": "Order & Delivery Tracking",
    "FEATURE_REQUEST": "Feature Requests & Feedback",
    "CANCELLATION_CHURN": "Cancellation & Churn",
    "ESCALATION_COMPLAINT": "Escalations & Complaints",
    "GENERAL_INQUIRY": "General Inquiries & FAQ"
}

# Comprehensive high-quality training dataset for customer support tweets
SEED_TRAINING_DATA = [
    # BILLING_REFUND (20 samples)
    ("I was charged twice for my subscription this month, please refund me!", "BILLING_REFUND"),
    ("Why is there an unauthorized $49 charge on my credit card?", "BILLING_REFUND"),
    ("Need my invoice and receipt for the last billing cycle.", "BILLING_REFUND"),
    ("I requested a refund 5 days ago and still have not received the money back.", "BILLING_REFUND"),
    ("Payment failed when trying to renew my annual plan with Mastercard.", "BILLING_REFUND"),
    ("You charged me after I already paused my subscription.", "BILLING_REFUND"),
    ("Can I get a prorated refund if I downgrade mid-month?", "BILLING_REFUND"),
    ("Double charge on invoice #94021, please credit my balance.", "BILLING_REFUND"),
    ("How do I update my payment method or credit card details?", "BILLING_REFUND"),
    ("My bank statement shows two transactions of $29.99 for Hiver.", "BILLING_REFUND"),
    ("Why did the subscription price increase without notice on my latest bill?", "BILLING_REFUND"),
    ("Please send the VAT tax invoice for accounting department.", "BILLING_REFUND"),
    ("Card declined error when attempting to pay for team expansion seats.", "BILLING_REFUND"),
    ("Charged for 15 users instead of 10 users on invoice #49102.", "BILLING_REFUND"),
    ("How long does it take for an approved refund to appear in my account?", "BILLING_REFUND"),
    ("Can we pay via wire transfer ACH or purchase order?", "BILLING_REFUND"),
    ("Overcharged $150 on annual renewal discount discrepancy.", "BILLING_REFUND"),
    ("Unexpected billing charge on my card statement from your service.", "BILLING_REFUND"),
    ("Reimburse the extra charge immediately please.", "BILLING_REFUND"),
    ("Billing portal is giving an error when entering new credit card.", "BILLING_REFUND"),

    # TECHNICAL_ISSUE (20 samples)
    ("Your web app is down right now with error 500 internal server error.", "TECHNICAL_ISSUE"),
    ("App crashes every time I click the export CSV button.", "TECHNICAL_ISSUE"),
    ("Emails are not syncing in the shared inbox, major glitch happening.", "TECHNICAL_ISSUE"),
    ("The dashboard is loading extremely slow and throwing 504 gateway timeout.", "TECHNICAL_ISSUE"),
    ("Unable to send replies, it says 'Network disconnect error code 4001'.", "TECHNICAL_ISSUE"),
    ("Is the platform experiencing an outage? None of our team can access data.", "TECHNICAL_ISSUE"),
    ("Found a critical bug where tags disappear after refreshing the page.", "TECHNICAL_ISSUE"),
    ("Mobile app on iOS crashes immediately on startup after latest update.", "TECHNICAL_ISSUE"),
    ("API webhooks stopped delivering payloads since 2pm UTC.", "TECHNICAL_ISSUE"),
    ("Search function returns blank screen with console error TypeError.", "TECHNICAL_ISSUE"),
    ("Getting 502 Bad Gateway across all workspace endpoints.", "TECHNICAL_ISSUE"),
    ("Chrome extension keeps disconnecting and requiring re-login.", "TECHNICAL_ISSUE"),
    ("Ticket comments fail to load with spinning loader icon.", "TECHNICAL_ISSUE"),
    ("System latency is terrible today, taking 30 seconds per message.", "TECHNICAL_ISSUE"),
    ("Email attachments are corrupting and failing to upload.", "TECHNICAL_ISSUE"),
    ("Automated workflow rules stopped triggering on incoming messages.", "TECHNICAL_ISSUE"),
    ("Broken interface formatting after today's product update.", "TECHNICAL_ISSUE"),
    ("Real-time notifications stopped popping up on desktop.", "TECHNICAL_ISSUE"),
    ("Server connection dropped unexpectedly while drafting response.", "TECHNICAL_ISSUE"),
    ("Is there an active incident with your cloud infrastructure?", "TECHNICAL_ISSUE"),

    # ACCOUNT_ACCESS (20 samples)
    ("I forgot my password and the reset link email is not arriving.", "ACCOUNT_ACCESS"),
    ("Locked out of my account because 2FA authenticator app was lost.", "ACCOUNT_ACCESS"),
    ("Need to change my registered login email address to my new work email.", "ACCOUNT_ACCESS"),
    ("SMS verification code is not being sent to my phone number.", "ACCOUNT_ACCESS"),
    ("Account suspended without explanation, please unlock my profile.", "ACCOUNT_ACCESS"),
    ("How do I enable Single Sign-On (SSO) with Okta or Google Workspace?", "ACCOUNT_ACCESS"),
    ("Someone tried to log into my account from an unknown IP, please secure it.", "ACCOUNT_ACCESS"),
    ("Cannot login, keeps saying invalid credentials even after resetting.", "ACCOUNT_ACCESS"),
    ("How do I invite teammates and assign admin roles in user management?", "ACCOUNT_ACCESS"),
    ("Security alert: my account was compromised, please revoke active sessions.", "ACCOUNT_ACCESS"),
    ("Lost backup security codes and cannot pass two-factor auth.", "ACCOUNT_ACCESS"),
    ("Password reset token expired before I could click it.", "ACCOUNT_ACCESS"),
    ("How do I transfer workspace ownership to a different team admin?", "ACCOUNT_ACCESS"),
    ("Unable to sign in with Google OAuth authentication button.", "ACCOUNT_ACCESS"),
    ("Account locked after 3 unsuccessful password attempts.", "ACCOUNT_ACCESS"),
    ("Need to revoke API key permissions for former employee.", "ACCOUNT_ACCESS"),
    ("Why was our corporate domain account deactivated?", "ACCOUNT_ACCESS"),
    ("Two factor SMS OTP never arrives on international mobile.", "ACCOUNT_ACCESS"),
    ("Admin user locked out of management settings panel.", "ACCOUNT_ACCESS"),
    ("How do we configure SAML 2.0 identity provider?", "ACCOUNT_ACCESS"),

    # ORDER_SHIPPING (20 samples)
    ("Where is my package? Tracking number #TRK-9824 has not updated in 4 days.", "ORDER_SHIPPING"),
    ("My package says delivered but nothing was left at my doorstep.", "ORDER_SHIPPING"),
    ("Received the wrong item in order #88412, I ordered the black version.", "ORDER_SHIPPING"),
    ("Item arrived damaged in transit, box was crushed and product broken.", "ORDER_SHIPPING"),
    ("How do I change the shipping delivery address before it ships?", "ORDER_SHIPPING"),
    ("Customs clearance delay on international shipment to UK, need update.", "ORDER_SHIPPING"),
    ("Can I expedite shipping to next day delivery for order #2910?", "ORDER_SHIPPING"),
    ("Courier missed the delivery window and did not leave a pickup slip.", "ORDER_SHIPPING"),
    ("Tracking status shows 'Return to Sender', why was it sent back?", "ORDER_SHIPPING"),
    ("Need tracking link for my order placed on Monday.", "ORDER_SHIPPING"),
    ("Package marked delivered to porch but no parcel found.", "ORDER_SHIPPING"),
    ("Missing items from our bulk hardware order shipment.", "ORDER_SHIPPING"),
    ("Estimated delivery date keeps getting pushed back by courier.", "ORDER_SHIPPING"),
    ("How do I track my dispatched replacement item?", "ORDER_SHIPPING"),
    ("Courier delivery driver reported address inaccessible.", "ORDER_SHIPPING"),
    ("Order status still showing processing after 7 business days.", "ORDER_SHIPPING"),
    ("Damaged goods arrived in torn box, need immediate replacement.", "ORDER_SHIPPING"),
    ("Wrong shipping address on confirmation email, please correct.", "ORDER_SHIPPING"),
    ("Where is my shipment #SHP-90219 heading?", "ORDER_SHIPPING"),
    ("Package held in customs inspection at border facility.", "ORDER_SHIPPING"),

    # FEATURE_REQUEST (20 samples)
    ("Would love if you could add dark mode to the web interface!", "FEATURE_REQUEST"),
    ("Please add support for Zapier and Make.com integrations.", "FEATURE_REQUEST"),
    ("Is there any plan to support WhatsApp channels in the shared inbox?", "FEATURE_REQUEST"),
    ("Feature suggestion: allow bulk tagging of tickets and automated macros.", "FEATURE_REQUEST"),
    ("Can you add keyboard shortcuts for faster navigation between threads?", "FEATURE_REQUEST"),
    ("Wishlist: customizable analytics dashboard with export to PDF.", "FEATURE_REQUEST"),
    ("Are you planning on releasing a native Mac desktop app?", "FEATURE_REQUEST"),
    ("It would be great to have multi-language auto-translation for incoming messages.", "FEATURE_REQUEST"),
    ("Please consider adding custom SLA rule triggers based on customer VIP tier.", "FEATURE_REQUEST"),
    ("Can we get voice notes support in ticket replies?", "FEATURE_REQUEST"),
    ("Would love integration with Jira, Linear, and GitHub issues.", "FEATURE_REQUEST"),
    ("Can you add custom emoji reactions inside customer notes?", "FEATURE_REQUEST"),
    ("Feature request: auto-assign tickets based on agent language proficiency.", "FEATURE_REQUEST"),
    ("Please build an option to schedule emails for future delivery.", "FEATURE_REQUEST"),
    ("Is there a way to customize status tags with custom hex colors?", "FEATURE_REQUEST"),
    ("Wishlist item: AI auto-summary of long email threads.", "FEATURE_REQUEST"),
    ("Any roadmap plans for tablet and iPad native optimizations?", "FEATURE_REQUEST"),
    ("Can you support rich markdown editing in ticket responses?", "FEATURE_REQUEST"),
    ("Feature request: automated CSAT survey triggers on ticket close.", "FEATURE_REQUEST"),
    ("Would be fantastic to have Kanban board view for support tickets.", "FEATURE_REQUEST"),

    # CANCELLATION_CHURN (20 samples)
    ("I want to cancel my subscription effective immediately.", "CANCELLATION_CHURN"),
    ("How do I close and delete my account permanently?", "CANCELLATION_CHURN"),
    ("We are switching to a competitor because your pricing is too steep.", "CANCELLATION_CHURN"),
    ("Please stop auto-renewing my annual plan, cancel it today.", "CANCELLATION_CHURN"),
    ("Unsubscribe me from this service and delete all stored team data.", "CANCELLATION_CHURN"),
    ("Your tool is missing essential features for our team, closing account.", "CANCELLATION_CHURN"),
    ("Downgrade my account from Enterprise to Free tier.", "CANCELLATION_CHURN"),
    ("How do I cancel before the trial ends so I don't get charged?", "CANCELLATION_CHURN"),
    ("Not using this anymore, please terminate my workspace.", "CANCELLATION_CHURN"),
    ("We are sunsetting our project and need to cancel our company subscription.", "CANCELLATION_CHURN"),
    ("Please confirm our subscription cancellation and shut down the account.", "CANCELLATION_CHURN"),
    ("We found a cheaper alternative and want to terminate our contract.", "CANCELLATION_CHURN"),
    ("How to opt-out of renewal and remove payment method?", "CANCELLATION_CHURN"),
    ("Cancelling our team account as we migrate to another platform.", "CANCELLATION_CHURN"),
    ("Please delete our workspace and terminate active billing plan.", "CANCELLATION_CHURN"),
    ("We decided not to continue after the 14-day free trial period.", "CANCELLATION_CHURN"),
    ("End our corporate subscription at the end of the current billing cycle.", "CANCELLATION_CHURN"),
    ("Stop charging our card, we no longer use your software.", "CANCELLATION_CHURN"),
    ("Cancel contract immediately due to change in business requirements.", "CANCELLATION_CHURN"),
    ("How do I permanently purge all our account records?", "CANCELLATION_CHURN"),

    # ESCALATION_COMPLAINT (20 samples)
    ("I demand to speak to a senior manager or supervisor immediately!", "ESCALATION_COMPLAINT"),
    ("Your customer support has been totally useless and ignored me for 3 weeks.", "ESCALATION_COMPLAINT"),
    ("This is a complete scam, I will be reporting your company to the FTC and BBB.", "ESCALATION_COMPLAINT"),
    ("Horrible, unacceptable service! My business lost thousands because of your negligence.", "ESCALATION_COMPLAINT"),
    ("If this is not resolved today I am contacting our corporate legal counsel to sue.", "ESCALATION_COMPLAINT"),
    ("Your agent was extremely rude and hung up on me, filing a formal complaint.", "ESCALATION_COMPLAINT"),
    ("Worst customer experience of my life, utterly incompetent team.", "ESCALATION_COMPLAINT"),
    ("I have contacted support 6 times with zero resolution. Escalating this publicly.", "ESCALATION_COMPLAINT"),
    ("This is breach of contract. I expect a call from your executive leadership.", "ESCALATION_COMPLAINT"),
    ("Fraudulent practices! You keep dodging my questions and locking my tickets.", "ESCALATION_COMPLAINT"),
    ("Disgusted with how paying enterprise customers are treated by your reps.", "ESCALATION_COMPLAINT"),
    ("Manager escalation needed immediately for critical unresolved dispute.", "ESCALATION_COMPLAINT"),
    ("I will post our chat transcripts on Twitter to warn others about this fraud.", "ESCALATION_COMPLAINT"),
    ("Third time your agent gave me false information that broke our setup.", "ESCALATION_COMPLAINT"),
    ("Filing a complaint with state attorney general and consumer protection.", "ESCALATION_COMPLAINT"),
    ("Unprofessional and rude support agent refused to help and closed ticket.", "ESCALATION_COMPLAINT"),
    ("Unacceptable delays on critical outage ticket, I want to speak to your VP.", "ESCALATION_COMPLAINT"),
    ("You are holding our data hostage and refusing to answer tickets.", "ESCALATION_COMPLAINT"),
    ("I am taking legal action against your company for gross negligence.", "ESCALATION_COMPLAINT"),
    ("Escalating to executive relations team after 4 days of zero reply.", "ESCALATION_COMPLAINT"),

    # GENERAL_INQUIRY (20 samples)
    ("What are your business hours and customer support availability?", "GENERAL_INQUIRY"),
    ("How does the shared inbox collaboration work for a team of 10?", "GENERAL_INQUIRY"),
    ("Do you offer non-profit or educational discounts for annual plans?", "GENERAL_INQUIRY"),
    ("Where can I find documentation on how to configure IMAP and SMTP?", "GENERAL_INQUIRY"),
    ("Is your platform SOC2 Type II and GDPR compliant?", "GENERAL_INQUIRY"),
    ("What are the pricing differences between Growth and Pro tiers?", "GENERAL_INQUIRY"),
    ("Do you provide a free trial without requiring a credit card upfront?", "GENERAL_INQUIRY"),
    ("Can someone from your sales team schedule a 15-minute product demo with us?", "GENERAL_INQUIRY"),
    ("Where are your data centers located and how is customer data encrypted?", "GENERAL_INQUIRY"),
    ("What browsers and operating systems are officially supported?", "GENERAL_INQUIRY"),
    ("How many team members can share a single inbox?", "GENERAL_INQUIRY"),
    ("Do you have an onboarding guide for new customer support reps?", "GENERAL_INQUIRY"),
    ("What is your standard SLA response time for priority support tiers?", "GENERAL_INQUIRY"),
    ("Can you provide your security whitepaper and compliance documentation?", "GENERAL_INQUIRY"),
    ("How does email collision detection prevent two agents answering at once?", "GENERAL_INQUIRY"),
    ("Is there an API available for exporting conversation logs?", "GENERAL_INQUIRY"),
    ("Can we pay annually by invoice or credit card?", "GENERAL_INQUIRY"),
    ("What features are included in the Enterprise plan?", "GENERAL_INQUIRY"),
    ("How does Hiver integrate directly with Google Workspace Gmail?", "GENERAL_INQUIRY"),
    ("Where can I check your official product uptime and status page?", "GENERAL_INQUIRY")
]

class IntentClassifier:
    def __init__(self):
        self.labels = INTENT_LABELS
        self.pipeline = None
        self._train_initial_model()

    def _train_initial_model(self):
        texts, labels = zip(*SEED_TRAINING_DATA)
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                ngram_range=(1, 2),
                max_features=3000,
                sublinear_tf=True,
                token_pattern=r'(?u)\b\w+\b'
            )),
            ('clf', LogisticRegression(
                C=4.0,
                max_iter=1000,
                class_weight='balanced',
                solver='lbfgs'
            ))
        ])
        self.pipeline.fit(texts, labels)

    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extracts key entities like Order IDs, Money amounts, Emails, Error codes, and Handles."""
        entities = {
            "order_ids": re.findall(r'#?[A-Z0-9]{3,}-[0-9]{3,}|#[0-9]{4,}', text, re.IGNORECASE),
            "amounts": re.findall(r'\$[0-9]+(?:\.[0-9]{2})?|\b[0-9]+(?:\.[0-9]{2})?\s*(?:usd|eur|gbp|dollars)\b', text, re.IGNORECASE),
            "error_codes": re.findall(r'\b(?:error|code|err)[-:\s]*[0-9]{3,4}\b|\b[45][0-9]{2}\s+(?:bad gateway|internal server|not found|unauthorized|gateway timeout)\b', text, re.IGNORECASE),
            "emails": re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text),
            "handles": re.findall(r'@[a-zA-Z0-9_]+', text)
        }
        return entities

    def detect_sub_intent(self, text: str, primary_intent: str) -> str:
        """Determines fine-grained sub-intent based on text context and primary intent."""
        lower = text.lower()
        if primary_intent == "BILLING_REFUND":
            if "double" in lower or "twice" in lower or "two times" in lower:
                return "Duplicate / Double Charge Dispute"
            elif "refund" in lower:
                return "Refund Request / Status Check"
            elif "invoice" in lower or "receipt" in lower or "vat" in lower:
                return "Invoice / Receipt Request"
            elif "fail" in lower or "declined" in lower:
                return "Payment Failed / Card Declined"
            return "General Billing Inquiry"
            
        elif primary_intent == "TECHNICAL_ISSUE":
            if "down" in lower or "outage" in lower or "500" in lower or "504" in lower or "502" in lower:
                return "Service Outage / Server Error"
            elif "crash" in lower:
                return "Application Crash on Action"
            elif "sync" in lower or "delay" in lower:
                return "Data Synchronization Lag"
            elif "api" in lower or "webhook" in lower:
                return "API / Webhook Integration Error"
            return "Software Bug / UI Glitch"
            
        elif primary_intent == "ACCOUNT_ACCESS":
            if "2fa" in lower or "otp" in lower or "authenticator" in lower or "code" in lower:
                return "Two-Factor Auth / OTP Failure"
            elif "password" in lower or "reset" in lower:
                return "Password Reset Link Issue"
            elif "compromise" in lower or "hack" in lower or "suspicious" in lower:
                return "Account Security Alert / Breach"
            elif "unlock" in lower or "locked" in lower or "suspended" in lower:
                return "Locked / Suspended Account Recovery"
            return "Login Credentials Issue"
            
        elif primary_intent == "ORDER_SHIPPING":
            if "delivered" in lower and ("not" in lower or "missing" in lower or "never" in lower):
                return "Marked Delivered But Not Received"
            elif "tracking" in lower or "track" in lower:
                return "Tracking Update Delayed"
            elif "damaged" in lower or "broken" in lower or "crushed" in lower:
                return "Item Damaged In Transit"
            elif "wrong" in lower or "incorrect" in lower:
                return "Incorrect Item Received"
            return "Shipping & Delivery Status"
            
        elif primary_intent == "FEATURE_REQUEST":
            if "dark mode" in lower:
                return "Dark Mode Interface Request"
            elif "integration" in lower or "zapier" in lower or "whatsapp" in lower or "linear" in lower or "jira" in lower:
                return "Third-Party Integration Request"
            elif "shortcut" in lower or "bulk" in lower:
                return "Workflow Automation / Productivity Tool"
            return "Product Roadmap & Feature Suggestion"
            
        elif primary_intent == "CANCELLATION_CHURN":
            if "competitor" in lower or "switching" in lower or "better" in lower:
                return "Competitor Defection Risk"
            elif "trial" in lower:
                return "Trial Cancellation Before Renewal"
            elif "delete" in lower or "data" in lower or "gdpr" in lower:
                return "Account Deletion & Data Purge"
            return "Subscription Cancellation Request"
            
        elif primary_intent == "ESCALATION_COMPLAINT":
            if "manager" in lower or "supervisor" in lower or "executive" in lower:
                return "Supervisor / Leadership Escalation Demand"
            elif "lawsuit" in lower or "sue" in lower or "legal" in lower or "lawyer" in lower or "ftc" in lower or "scam" in lower:
                return "Legal / Regulatory Action Threat"
            elif "rude" in lower or "attitude" in lower or "hung up" in lower:
                return "Agent Conduct & Service Quality Complaint"
            return "Severe Customer Frustration Escalation"
            
        else: # GENERAL_INQUIRY
            if "pricing" in lower or "tier" in lower or "cost" in lower or "plan" in lower:
                return "Pricing & Plan Comparison"
            elif "demo" in lower or "sales" in lower:
                return "Sales Demo Request"
            elif "compliance" in lower or "gdpr" in lower or "soc2" in lower or "security" in lower:
                return "Security & Compliance Standards"
            return "General Product Information & FAQ"

    def predict(self, text: str) -> Tuple[str, float, Dict[str, float], str, Dict[str, List[str]]]:
        """
        Classifies tweet into intent, confidence, calibrated probability distribution,
        sub-intent, and extracted entities.
        """
        # Get raw decision function or probabilities
        raw_probs = self.pipeline.predict_proba([text])[0]
        class_indices = list(self.pipeline.classes_)
        
        # Apply temperature scaling (T=0.45) to calibrate multi-class distribution for 8 classes
        temperature = 0.45
        scaled_logits = np.log(np.maximum(raw_probs, 1e-7)) / temperature
        calibrated_probs = np.exp(scaled_logits - np.max(scaled_logits))
        calibrated_probs = calibrated_probs / np.sum(calibrated_probs)
        
        prob_dict = {
            class_name: round(float(prob), 4)
            for class_name, prob in zip(class_indices, calibrated_probs)
        }
        
        # Ensure all standard labels are represented
        for label in self.labels:
            if label not in prob_dict:
                prob_dict[label] = 0.0001
                
        best_intent = max(prob_dict, key=prob_dict.get)
        confidence = float(prob_dict[best_intent])
        
        # Keyword rule boosters for unambiguous terms
        lower = text.lower()
        if any(w in lower for w in ["charged twice", "refund", "charge on my card", "invoice", "double charge", "billed twice"]):
            best_intent = "BILLING_REFUND"
            confidence = max(0.92, confidence)
            prob_dict["BILLING_REFUND"] = confidence
                
        if any(w in lower for w in ["outage", "down right now", "error 500", "504 gateway", "502 bad gateway", "crashes every time", "site down"]):
            best_intent = "TECHNICAL_ISSUE"
            confidence = max(0.94, confidence)
            prob_dict["TECHNICAL_ISSUE"] = confidence
                
        if any(w in lower for w in ["speak to a manager", "demand to speak", "supervisor", "scam", "lawyer", "legal counsel", "sue you", "legal action"]):
            best_intent = "ESCALATION_COMPLAINT"
            confidence = max(0.96, confidence)
            prob_dict["ESCALATION_COMPLAINT"] = confidence

        if any(w in lower for w in ["cancel my subscription", "close my account", "unsubscribe me", "stop auto-renewing", "switching to a competitor"]):
            best_intent = "CANCELLATION_CHURN"
            confidence = max(0.93, confidence)
            prob_dict["CANCELLATION_CHURN"] = confidence

        if any(w in lower for w in ["tracking number", "where is my package", "package says delivered", "delivery tracking", "courier"]):
            best_intent = "ORDER_SHIPPING"
            confidence = max(0.92, confidence)
            prob_dict["ORDER_SHIPPING"] = confidence

        if any(w in lower for w in ["forgot my password", "lost my 2fa", "2fa authenticator", "verification code", "reset link", "locked out of my account"]):
            best_intent = "ACCOUNT_ACCESS"
            confidence = max(0.94, confidence)
            prob_dict["ACCOUNT_ACCESS"] = confidence

        if any(w in lower for w in ["feature request", "would love if you could add", "dark mode", "wishlist", "feature suggestion"]):
            best_intent = "FEATURE_REQUEST"
            confidence = max(0.92, confidence)
            prob_dict["FEATURE_REQUEST"] = confidence

        # Normalize prob_dict so sum = 1.0
        total_p = sum(prob_dict.values())
        prob_dict = {k: round(v / total_p, 4) for k, v in prob_dict.items()}
        confidence = float(prob_dict[best_intent])

        sub_intent = self.detect_sub_intent(text, best_intent)
        entities = self.extract_entities(text)
        
        return best_intent, confidence, prob_dict, sub_intent, entities

    def classify(self, text: str) -> Dict[str, Any]:
        """Convenience method returning full dictionary of classification results."""
        intent, conf, probs, sub_intent, entities = self.predict(text)
        return {
            "intent": intent,
            "confidence": conf,
            "probabilities": probs,
            "sub_intent": sub_intent,
            "entities": entities
        }

intent_classifier = IntentClassifier()

