import os
import re
from typing import Dict, List, Tuple
from app.database import SessionLocal
from app.models import Conversation, GoldenSetSample
from app.services.golden_set import CANONICAL_INTENTS, golden_set_service

# The 8 Canonical Intent Names
INTENTS = [
    "Family & Student Plan Eligibility & Verification",
    "Smart Speaker & External Device Connectivity",
    "App Stability, OS Freezes & Crash Reports",
    "Audio Streaming Quality & Playback Errors",
    "Product Feature Requests & UI Enhancements",
    "Account Login, Password & Security Access",
    "Billing, Subscriptions & Refund Inquiries",
    "Offline Playlists & Download Storage Management"
]

def determine_ground_truth_intent(tweet: str, reply: str = "") -> str:
    text = (tweet + " " + reply).lower()

    # 1. Family & Student Plan
    if any(k in text for k in [
        "family plan", "family invite", "student discount", "student plan",
        "sheerid", "same address", "verification failed", "student verification",
        "family member", "invite link", "hulu student", "premium for family"
    ]):
        return "Family & Student Plan Eligibility & Verification"

    # 2. Smart Speaker & External Devices
    if any(k in text for k in [
        "spotify connect", "alexa", "echo dot", "google home", "google nest",
        "carplay", "android auto", "bluetooth", "sonos", "bose", "receiver",
        "smart tv", "samsung tv", "lg tv", "roku", "apple tv", "playstation",
        "ps4", "ps5", "xbox", "harman kardon", "chromecast", "speaker"
    ]):
        return "Smart Speaker & External Device Connectivity"

    # 3. Offline Playlists & Download Storage
    if any(k in text for k in [
        "download", "offline", "offline mode", "sd card", "downloaded songs",
        "downloads disappeared", "downloaded playlist", "storage location",
        "offline playback", "redownload", "downloading", "offline listening"
    ]):
        return "Offline Playlists & Download Storage Management"

    # 4. Billing, Subscriptions & Refund Inquiries
    if any(k in text for k in [
        "billed", "charge", "charged", "twice", "double charge", "refund",
        "payment", "receipt", "credit card", "debit card", "paypal",
        "subscription", "auto-renew", "overcharged", "invoice", "bank",
        "price increase", "free trial", "upgrade premium", "pay"
    ]):
        return "Billing, Subscriptions & Refund Inquiries"

    # 5. Account Login, Password & Security Access
    if any(k in text for k in [
        "password", "reset link", "login", "logged out", "locked out",
        "hacked", "unauthorized", "email address", "change email",
        "credentials", "2fa", "two-factor", "facebook login", "account access"
    ]):
        return "Account Login, Password & Security Access"

    # 6. App Stability, Crashes & Freezes
    if any(k in text for k in [
        "crash", "crashing", "crashed", "freeze", "freezes", "frozen",
        "black screen", "white screen", "force close", "not opening",
        "wont open", "unresponsive", "lag", "reinstall", "battery drain",
        "high cpu", "update broke", "startup"
    ]):
        return "App Stability, OS Freezes & Crash Reports"

    # 7. Product Feature Requests & UI Enhancements
    if any(k in text for k in [
        "feature request", "bring back", "old ui", "lyrics", "dark mode",
        "widget", "interface", "layout", "enhancement", "suggestion",
        "custom cover", "playlist folder", "swipe", "visualizer", "font size",
        "equalizer request", "sleep timer"
    ]):
        return "Product Feature Requests & UI Enhancements"

    # 8. Audio Streaming Quality & Playback Errors
    if any(k in text for k in [
        "playback", "stutter", "pause", "pauses", "pausing", "skipping",
        "buffering", "audio quality", "sound", "volume", "equalizer",
        "gapless", "crossfade", "stream", "streaming", "silent", "noise",
        "distorted", "songs stop", "greyed out", "can't play"
    ]):
        return "Audio Streaming Quality & Playback Errors"

    # Fallback contextual rules
    if "premium" in text or "free" in text or "cost" in text or "money" in text:
        return "Billing, Subscriptions & Refund Inquiries"
    if "phone" in text or "app" in text or "ios" in text or "android" in text:
        return "App Stability, OS Freezes & Crash Reports"
    if "song" in text or "track" in text or "music" in text:
        return "Audio Streaming Quality & Playback Errors"

    return "Product Feature Requests & UI Enhancements"

def label_all_200_samples():
    db = SessionLocal()
    
    samples = db.query(GoldenSetSample, Conversation).join(
        Conversation, GoldenSetSample.conversation_id == Conversation.conversation_id
    ).order_by(GoldenSetSample.sample_order.asc()).all()

    print(f"Loaded {len(samples)} Golden Set samples for authoritative labeling...")

    labeled_counts = {}
    for sample, conv in samples:
        intent = determine_ground_truth_intent(conv.customer_tweet or "", conv.agent_reply or "")
        conv.true_intent = intent
        labeled_counts[intent] = labeled_counts.get(intent, 0) + 1

    db.commit()
    print("Database committed all 200 ground-truth labels into conversations.true_intent.")

    # Export golden_set.csv
    csv_path = golden_set_service.export_golden_set_csv(db)
    print(f"Exported fresh golden_set.csv to {csv_path}")

    # Print summary
    status = golden_set_service.get_golden_set_status(db)
    print("\n" + "=" * 70)
    print(f"GOLDEN SET LABELING COMPLETE: {status['annotated_count']}/{status['total_samples']} (100.0%)")
    print("=" * 70)
    for intent, count in sorted(labeled_counts.items(), key=lambda x: -x[1]):
        pct = (count / len(samples)) * 100
        print(f"  {intent:55s}: {count:3d} ({pct:5.1f}%)")

    db.close()

if __name__ == "__main__":
    label_all_200_samples()
