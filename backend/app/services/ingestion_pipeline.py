import os
import re
import csv
import json
import datetime
from email.utils import parsedate_to_datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models import Conversation, IngestionReport
from .twcs_generator import ensure_sample_twcs_file
from .intent_classifier import intent_classifier

def parse_twitter_date(date_str: str) -> datetime.datetime:
    """Parses various Twitter date string formats into a datetime object."""
    if not date_str:
        return datetime.datetime.utcnow()
    try:
        # Standard Twitter RFC 2822: 'Tue Oct 31 20:11:15 +0000 2017'
        dt = parsedate_to_datetime(date_str)
        return dt.replace(tzinfo=None)
    except Exception:
        pass
    
    for fmt in [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%a %b %d %H:%M:%S %z %Y",
        "%Y-%m-%d"
    ]:
        try:
            return datetime.datetime.strptime(date_str.strip(), fmt)
        except Exception:
            continue
    return datetime.datetime.utcnow()

def clean_tweet_text(text: Optional[str]) -> str:
    """Cleans tweet text, removes corrupted artifacts, and normalizes whitespace."""
    if not text:
        return ""
    # Strip carriage returns and control characters
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Normalize multiple whitespace into single space
    text = re.sub(r'[ \t]+', ' ', text)
    # Remove leading/trailing whitespace
    return text.strip()

def is_deleted_or_empty(text: Optional[str]) -> bool:
    """Checks if tweet content is deleted, empty, or placeholder."""
    if not text:
        return True
    cleaned = text.strip().lower()
    if cleaned in ["", "[deleted]", "deleted", "nan", "null", "none"]:
        return True
    if len(cleaned) < 2:
        return True
    return False

class TwcsSpotifyPipeline:
    """
    Ingestion & Data Cleaning Pipeline for Kaggle 'Customer Support on Twitter' (twcs.csv).
    Specialized for Spotify brand conversation reconstruction, cleaning, deduplication, and database ingestion.
    """
    
    def __init__(self):
        pass

    def run_pipeline(
        self,
        csv_file_path: Optional[str] = None,
        db: Optional[Session] = None,
        brand_filter: str = "Spotify",
        brand_handle: str = "SpotifyCares"
    ) -> Dict[str, Any]:
        """
        Executes the 7-step ingestion & cleaning pipeline on the Twitter Customer Support dataset.
        """
        if not csv_file_path or not os.path.exists(csv_file_path):
            # Fallback to ensuring local sample twcs.csv exists
            csv_file_path = ensure_sample_twcs_file("backend/data/twcs.csv")
            
        total_raw_rows = 0
        raw_tweets: Dict[str, Dict[str, Any]] = {}
        
        # Breakdown counters
        count_non_spotify = 0
        count_empty_or_deleted = 0
        count_unresolved = 0
        count_duplicates = 0
        
        # Step 1 & 2: Stream and parse CSV, filter Spotify mentions/authors
        with open(csv_file_path, mode="r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_raw_rows += 1
                tweet_id = str(row.get("tweet_id", "")).strip()
                if not tweet_id:
                    count_empty_or_deleted += 1
                    continue
                    
                author_id = str(row.get("author_id", "")).strip()
                inbound_str = str(row.get("inbound", "")).strip().lower()
                inbound = inbound_str in ["true", "1", "t", "yes"]
                created_at_str = str(row.get("created_at", "")).strip()
                text = clean_tweet_text(row.get("text", ""))
                response_tweet_id = str(row.get("response_tweet_id", "")).strip()
                in_response_to_tweet_id = str(row.get("in_response_to_tweet_id", "")).strip()
                
                raw_tweets[tweet_id] = {
                    "tweet_id": tweet_id,
                    "author_id": author_id,
                    "inbound": inbound,
                    "created_at": created_at_str,
                    "text": text,
                    "response_tweet_id": response_tweet_id,
                    "in_response_to_tweet_id": in_response_to_tweet_id
                }

        # Step 3 & 4: Reconstruct threads for Spotify brand & apply cleaning filters
        spotify_handles = {brand_handle.lower(), "spotify", "spotifycares", "@spotifycares", "@spotify"}
        
        # Map of Spotify replies indexed by in_response_to_tweet_id
        spotify_replies_by_in_response: Dict[str, Dict[str, Any]] = {}
        for t_id, t in raw_tweets.items():
            author_lower = t["author_id"].lower()
            if author_lower in ["spotifycares", "spotify"]:
                in_resp = t["in_response_to_tweet_id"]
                if in_resp:
                    spotify_replies_by_in_response[in_resp] = t

        cleaned_conversations: List[Dict[str, Any]] = []
        seen_threads = set()
        seen_text_pairs = set()

        for t_id, t in raw_tweets.items():
            author_lower = t["author_id"].lower()
            text_lower = t["text"].lower()
            is_spotify_author = author_lower in ["spotifycares", "spotify"]
            mentions_spotify = any(h in text_lower for h in ["@spotifycares", "@spotify", "spotify"])
            
            # Check if tweet is linked to a Spotify response
            has_spotify_link = t_id in spotify_replies_by_in_response
            if not has_spotify_link and t["response_tweet_id"]:
                resp_ids = [r.strip() for r in t["response_tweet_id"].split(",") if r.strip()]
                for rid in resp_ids:
                    candidate = raw_tweets.get(rid)
                    if candidate and candidate["author_id"].lower() in ["spotifycares", "spotify"]:
                        has_spotify_link = True
                        break

            # Filter non-Spotify rows
            if not is_spotify_author and not mentions_spotify and not has_spotify_link:
                count_non_spotify += 1
                continue

            # Support replies are consumed when paired with customer tweets
            if is_spotify_author:
                continue

            customer_text = t["text"]

            # Check for deleted or empty messages
            if is_deleted_or_empty(customer_text):
                count_empty_or_deleted += 1
                continue

            # Find matching Spotify Agent reply
            agent_reply_tweet = None
            
            # Strategy A: Check response_tweet_id
            if t["response_tweet_id"]:
                resp_ids = [r.strip() for r in t["response_tweet_id"].split(",") if r.strip()]
                for rid in resp_ids:
                    candidate = raw_tweets.get(rid)
                    if candidate and candidate["author_id"].lower() in ["spotifycares", "spotify"]:
                        agent_reply_tweet = candidate
                        break
                        
            # Strategy B: Check in_response_to index
            if not agent_reply_tweet and t_id in spotify_replies_by_in_response:
                agent_reply_tweet = spotify_replies_by_in_response[t_id]

            # If no Spotify reply found -> unresolved conversation
            if not agent_reply_tweet:
                count_unresolved += 1
                continue
                
            agent_reply_text = clean_tweet_text(agent_reply_tweet["text"])
            if is_deleted_or_empty(agent_reply_text):
                count_empty_or_deleted += 1
                continue

            # Check for duplicate conversation pair
            pair_key = (customer_text.strip().lower(), agent_reply_text.strip().lower())
            if pair_key in seen_text_pairs or t_id in seen_threads:
                count_duplicates += 1
                continue
                
            seen_text_pairs.add(pair_key)
            seen_threads.add(t_id)

            # Infer intent for ground truth / metadata
            try:
                classified = intent_classifier.classify(customer_text)
                true_intent = classified.get("intent", "TECHNICAL_ISSUE")
            except Exception:
                true_intent = "TECHNICAL_ISSUE"

            parsed_created_at = parse_twitter_date(t["created_at"])

            cleaned_conversations.append({
                "conversation_id": f"twcs_{t_id}",
                "brand": "Spotify",
                "customer_tweet": customer_text,
                "agent_reply": agent_reply_text,
                "is_customer": True,
                "true_intent": true_intent,
                "created_at": parsed_created_at
            })

        # Calculate metrics
        final_cleaned_count = len(cleaned_conversations)
        rows_removed = max(0, total_raw_rows - final_cleaned_count)
        percentage_retained = round((final_cleaned_count / total_raw_rows * 100), 2) if total_raw_rows > 0 else 0.0

        cleaning_report = {
            "dataset_name": "Kaggle Customer Support on Twitter (twcs.csv)",
            "brand": "Spotify",
            "file_source": os.path.basename(csv_file_path),
            "total_raw_rows": total_raw_rows,
            "rows_removed": rows_removed,
            "final_cleaned_conversations": final_cleaned_count,
            "percentage_retained": percentage_retained,
            "removed_breakdown": {
                "non_spotify_brand_rows": count_non_spotify,
                "unresolved_conversations_no_reply": count_unresolved,
                "empty_or_deleted_messages": count_empty_or_deleted,
                "duplicate_threads": count_duplicates
            },
            "preview_conversations": [
                {
                    "conversation_id": c["conversation_id"],
                    "brand": c["brand"],
                    "customer_tweet": c["customer_tweet"],
                    "agent_reply": c["agent_reply"],
                    "is_customer": c["is_customer"],
                    "true_intent": c["true_intent"],
                    "created_at": c["created_at"].isoformat() if isinstance(c["created_at"], datetime.datetime) else str(c["created_at"])
                }
                for c in cleaned_conversations[:20]
            ]
        }

        # Step 5: Populate conversations table in PostgreSQL / SQLite
        if db is not None:
            try:
                # Upsert cleaned conversations
                for conv in cleaned_conversations:
                    existing = db.query(Conversation).filter(Conversation.conversation_id == conv["conversation_id"]).first()
                    if not existing:
                        db_conv = Conversation(
                            conversation_id=conv["conversation_id"],
                            brand=conv["brand"],
                            customer_tweet=conv["customer_tweet"],
                            agent_reply=conv["agent_reply"],
                            is_customer=conv["is_customer"],
                            true_intent=conv["true_intent"],
                            created_at=conv["created_at"]
                        )
                        db.add(db_conv)
                
                # Save Ingestion Report record
                report_entry = IngestionReport(
                    dataset_name="Kaggle Customer Support on Twitter (twcs.csv)",
                    brand="Spotify",
                    total_raw_rows=total_raw_rows,
                    rows_removed=rows_removed,
                    final_cleaned_conversations=final_cleaned_count,
                    percentage_retained=percentage_retained,
                    removed_breakdown_json=json.dumps(cleaning_report["removed_breakdown"]),
                    created_at=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(report_entry)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"[Pipeline] Database commit error: {e}")

        return cleaning_report

ingestion_pipeline = TwcsSpotifyPipeline()
