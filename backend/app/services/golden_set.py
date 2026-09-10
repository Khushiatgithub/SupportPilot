import os
import csv
import random
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from ..models import Conversation, GoldenSetSample, DiscoveredIntentModel

logger = logging.getLogger("GoldenSetService")


# Canonical 8 Spotify Support Intents
CANONICAL_INTENTS = [
    {
        "intent_id": 1,
        "intent_code": "FAMILY_STUDENT_PLAN_ELIGIBILITY",
        "intent_name": "Family & Student Plan Eligibility & Verification",
        "description": "Issues related to family plan invites, student discount renewals, eligibility errors, address verification, and member limits.",
        "badge_color": "indigo",
        "hotkey": "1"
    },
    {
        "intent_id": 2,
        "intent_code": "DEVICE_SMART_SPEAKER_CONNECT",
        "intent_name": "Smart Speaker & External Device Connectivity",
        "description": "Inquiries regarding Spotify Connect, Alexa/Echo, Google Home, smart TVs, Apple CarPlay, Bluetooth speakers, and receiver pairing.",
        "badge_color": "cyan",
        "hotkey": "2"
    },
    {
        "intent_id": 3,
        "intent_code": "APP_PERFORMANCE_STABILITY",
        "intent_name": "App Stability, OS Freezes & Crash Reports",
        "description": "Technical reports of mobile/desktop app crashing, UI unresponsive freezes, battery drain, high CPU usage, and launch failures.",
        "badge_color": "rose",
        "hotkey": "3"
    },
    {
        "intent_id": 4,
        "intent_code": "AUDIO_PLAYBACK_STREAMING",
        "intent_name": "Audio Streaming Quality & Playback Errors",
        "description": "Complaints about song buffering, stuttering audio, playback stopping unexpectedly, track skipping, and missing local files.",
        "badge_color": "amber",
        "hotkey": "4"
    },
    {
        "intent_id": 5,
        "intent_code": "FEATURE_REQUESTS_UI",
        "intent_name": "Product Feature Requests & UI Enhancements",
        "description": "Suggestions for new features, playlist UI customization, custom cover art, lyrics display, UI dark mode, and widget enhancements.",
        "badge_color": "purple",
        "hotkey": "5"
    },
    {
        "intent_id": 6,
        "intent_code": "ACCOUNT_LOGIN_SECURITY",
        "intent_name": "Account Login, Password & Security Access",
        "description": "Customer issues with password resets, two-factor authentication, unauthorized foreign logins, email changes, and account recovery.",
        "badge_color": "orange",
        "hotkey": "6"
    },
    {
        "intent_id": 7,
        "intent_code": "BILLING_SUBSCRIPTION_CHARGES",
        "intent_name": "Billing, Subscriptions & Refund Inquiries",
        "description": "Inquiries regarding double charges, failed credit card payments, refund requests, premium subscription status, and billing invoices.",
        "badge_color": "emerald",
        "hotkey": "7"
    },
    {
        "intent_id": 8,
        "intent_code": "OFFLINE_PLAYLISTS_DOWNLOAD",
        "intent_name": "Offline Playlists & Download Storage Management",
        "description": "Problems with offline song downloads, SD card storage location, downloaded songs disappearing, and offline mode sync failures.",
        "badge_color": "blue",
        "hotkey": "8"
    }
]


class GoldenSetService:
    def __init__(self, sample_size: int = 200, random_seed: int = 42):
        self.sample_size = sample_size
        self.random_seed = random_seed

    def get_canonical_intents(self, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        """Returns the list of 8 available intents with metadata and hotkeys."""
        if db:
            db_intents = db.query(DiscoveredIntentModel).order_by(asc(DiscoveredIntentModel.cluster_id)).all()
            if len(db_intents) == 8:
                merged = []
                for idx, item in enumerate(db_intents):
                    fallback = CANONICAL_INTENTS[idx] if idx < len(CANONICAL_INTENTS) else {}
                    merged.append({
                        "intent_id": item.cluster_id,
                        "intent_code": item.intent_code,
                        "intent_name": item.intent_name,
                        "description": item.description,
                        "badge_color": fallback.get("badge_color", "teal"),
                        "hotkey": str(item.cluster_id)
                    })
                return merged
        return CANONICAL_INTENTS

    def get_or_create_samples(self, db: Session, sample_size: int = 200, resample: bool = False) -> List[GoldenSetSample]:
        """
        Retrieves or generates 200 randomly sampled conversations from the conversations table.
        """
        existing = db.query(GoldenSetSample).order_by(asc(GoldenSetSample.sample_order)).all()
        
        if existing and len(existing) == sample_size and not resample:
            return existing

        if resample and existing:
            db.query(GoldenSetSample).delete()
            db.commit()

        # Query all available Spotify conversations
        all_convs = db.query(Conversation.conversation_id).filter(
            Conversation.brand == "Spotify",
            Conversation.customer_tweet != None,
            Conversation.customer_tweet != ""
        ).all()
        
        all_ids = [c[0] for c in all_convs]
        if not all_ids:
            logger.warning("No Spotify conversations found in database to sample from.")
            return []

        # Sample 200 conversations
        target_size = min(sample_size, len(all_ids))
        rng = random.Random(self.random_seed if not resample else random.randint(1, 999999))
        sampled_ids = rng.sample(all_ids, target_size)

        new_samples = []
        for order_idx, cid in enumerate(sampled_ids, start=1):
            sample = GoldenSetSample(
                conversation_id=cid,
                sample_order=order_idx,
                created_at=datetime.now(timezone.utc)
            )
            db.add(sample)
            new_samples.append(sample)

        db.commit()
        return new_samples

    def get_golden_set_status(self, db: Session) -> Dict[str, Any]:
        """
        Returns all 200 golden set samples with conversations metadata and completion metrics.
        """
        self.get_or_create_samples(db, sample_size=self.sample_size)

        # Query joined samples and conversations ordered by sample_order
        results = db.query(GoldenSetSample, Conversation).join(
            Conversation, GoldenSetSample.conversation_id == Conversation.conversation_id
        ).order_by(asc(GoldenSetSample.sample_order)).all()

        intents = self.get_canonical_intents(db)
        
        items = []
        annotated_count = 0

        for sample, conv in results:
            has_true_intent = bool(conv.true_intent and conv.true_intent.strip())
            if has_true_intent:
                annotated_count += 1

            items.append({
                "sample_order": sample.sample_order,
                "conversation_id": conv.conversation_id,
                "customer_tweet": conv.customer_tweet,
                "agent_reply": conv.agent_reply or "",
                "suggested_intent": conv.suggested_intent or "Unassigned",
                "true_intent": conv.true_intent or None,
                "is_annotated": has_true_intent,
                "created_at": conv.created_at.isoformat() if conv.created_at else ""
            })

        total_samples = len(items)
        remaining_count = total_samples - annotated_count
        progress_pct = round((annotated_count / total_samples * 100), 1) if total_samples > 0 else 0.0

        return {
            "total_samples": total_samples,
            "annotated_count": annotated_count,
            "remaining_count": remaining_count,
            "progress_pct": progress_pct,
            "is_complete": remaining_count == 0 and total_samples > 0,
            "available_intents": intents,
            "items": items
        }

    def save_annotation(self, db: Session, conversation_id: str, true_intent: str) -> Dict[str, Any]:
        """
        Saves the human-annotated true_intent directly into conversations.true_intent.
        """
        conv = db.query(Conversation).filter(Conversation.conversation_id == conversation_id).first()
        if not conv:
            raise ValueError(f"Conversation with ID '{conversation_id}' not found.")

        conv.true_intent = true_intent.strip()
        db.commit()
        db.refresh(conv)

        # Recalculate progress
        annotated_count = db.query(GoldenSetSample).join(
            Conversation, GoldenSetSample.conversation_id == Conversation.conversation_id
        ).filter(
            Conversation.true_intent != None,
            Conversation.true_intent != ""
        ).count()

        total_samples = db.query(GoldenSetSample).count()
        remaining_count = max(0, total_samples - annotated_count)
        progress_pct = round((annotated_count / total_samples * 100), 1) if total_samples > 0 else 0.0

        return {
            "success": True,
            "conversation_id": conv.conversation_id,
            "true_intent": conv.true_intent,
            "suggested_intent": conv.suggested_intent,
            "annotated_count": annotated_count,
            "remaining_count": remaining_count,
            "total_samples": total_samples,
            "progress_pct": progress_pct,
            "is_complete": remaining_count == 0
        }

    def export_golden_set_csv(self, db: Session) -> str:
        """
        Exports the 200 golden set conversations to golden_set.csv.
        """
        status = self.get_golden_set_status(db)
        items = status["items"]

        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        data_dir = os.path.join(backend_dir, "data")
        os.makedirs(data_dir, exist_ok=True)
        
        csv_path_backend = os.path.join(data_dir, "golden_set.csv")
        csv_path_root = os.path.join(os.path.dirname(backend_dir), "golden_set.csv")

        fieldnames = [
            "sample_number",
            "conversation_id",
            "customer_tweet",
            "agent_reply",
            "suggested_intent",
            "true_intent",
            "is_customer",
            "created_at"
        ]

        for path in [csv_path_backend, csv_path_root]:
            with open(path, mode="w", newline="", encoding="utf-8") as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                for item in items:
                    writer.writerow({
                        "sample_number": item["sample_order"],
                        "conversation_id": item["conversation_id"],
                        "customer_tweet": item["customer_tweet"],
                        "agent_reply": item["agent_reply"],
                        "suggested_intent": item["suggested_intent"],
                        "true_intent": item["true_intent"] or "",
                        "is_customer": True,
                        "created_at": item["created_at"]
                    })

        logger.info(f"Golden set exported successfully ({len(items)} rows) to {csv_path_backend}")
        return csv_path_backend


golden_set_service = GoldenSetService()
