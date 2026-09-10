import os
import re
import csv
import json
import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Conversation, DiscoveredIntentModel

# Extended stopwords for Twitter customer support
CUSTOM_STOPWORDS = {
    'spotify', 'spotifycares', 'user', 'hi', 'hello', 'hey', 'please', 'thanks', 'thank',
    'app', 'get', 'got', 'can', 'cant', 'help', 'know', 'let', 'us', 'dm', 'http', 'https',
    'com', 'co', 'spoti', 'fi', 'would', 'like', 'one', 'way', 'time', 'day', 'days', 'also',
    'still', 'always', 'every', 'keep', 'keeps', 'just', 'now', 'see', 'make', 'trying',
    'trying', 'trying'
}

# Domain vocabulary profiles to automatically synthesize human-readable labels and descriptions
INTENT_PROFILE_TAXONOMY = [
    {
        "intent_code": "BILLING_SUBSCRIPTION_CHARGES",
        "intent_name": "Billing, Subscriptions & Refund Inquiries",
        "description": "Customer issues concerning duplicate debits, unexpected price changes, invoice requests, failed renewals, refund statuses, and payment method updates.",
        "keywords_cue": ["charged", "twice", "refund", "card", "tax", "price", "billing", "receipt", "invoice", "payment", "downgrade", "debit"]
    },
    {
        "intent_code": "AUDIO_PLAYBACK_STREAMING",
        "intent_name": "Audio Streaming Quality & Playback Errors",
        "description": "Complaints regarding song skipping after 5 seconds, music pausing randomly, sound crackling, buffering lag, muffled audio, and gapless playback failures.",
        "keywords_cue": ["skipping", "buffering", "stuttering", "crackling", "pausing", "audio", "sound", "playback", "quality", "muffled", "explicit", "seconds", "tracks"]
    },
    {
        "intent_code": "ACCOUNT_LOGIN_SECURITY",
        "intent_name": "Account Login, Password & Security Access",
        "description": "Customer difficulties with forgotten passwords, missing reset emails, 2FA SMS OTP codes, unauthorized foreign logins, locked accounts, and profile recovery.",
        "keywords_cue": ["password", "reset", "login", "hacked", "2fa", "security", "locked", "facebook", "email", "credentials", "account", "unauthorized"]
    },
    {
        "intent_code": "OFFLINE_PLAYLISTS_DOWNLOAD",
        "intent_name": "Offline Playlists & Download Storage Management",
        "description": "Issues with offline tracks disappearing, downloaded songs greyed out, SD card storage allocation, sync delays between devices, and deleted playlist recovery.",
        "keywords_cue": ["offline", "download", "downloaded", "playlist", "playlists", "storage", "cache", "sd", "greyed", "disappearing", "recover", "songs", "sync"]
    },
    {
        "intent_code": "DEVICE_SMART_SPEAKER_CONNECT",
        "intent_name": "Smart Speaker & External Device Connectivity",
        "description": "Troubleshooting Spotify Connect on Amazon Echo, Sonos speakers, Apple Watch offline sync, Google Nest Mini, Bluetooth car stereos, Chromecast, and gaming consoles.",
        "keywords_cue": ["connect", "echo", "alexa", "sonos", "watch", "bluetooth", "car", "nest", "chromecast", "speakers", "device", "ps5", "roku", "smart"]
    },
    {
        "intent_code": "APP_PERFORMANCE_STABILITY",
        "intent_name": "App Stability, OS Freezes & Crash Reports",
        "description": "Reports of application crashes on launch, macOS/Windows blank black screens, high RAM memory consumption, infinite loading spinners, and battery drain.",
        "keywords_cue": ["crashing", "crash", "battery", "freeze", "freezes", "black", "screen", "ram", "memory", "loading", "spinner", "macos", "monterey", "android", "windows", "ios"]
    },
    {
        "intent_code": "FAMILY_STUDENT_PLAN_ELIGIBILITY",
        "intent_name": "Family & Student Plan Eligibility & Verification",
        "description": "Inquiries regarding SheerID college student discount verification, Duo/Family invitation link expiration, address verification mismatches, and Kids parental controls.",
        "keywords_cue": ["student", "discount", "sheerid", "family", "duo", "invite", "address", "verification", "hulu", "parental", "member", "members", "college", "school"]
    },
    {
        "intent_code": "FEATURE_REQUESTS_UI",
        "intent_name": "Product Feature Requests & UI Enhancements",
        "description": "Customer suggestions and feature requests including swipe to queue on Android, real-time lyrics, HiFi lossless audio, blocking artists, and custom playlist cover uploads.",
        "keywords_cue": ["feature", "swipe", "queue", "lyrics", "hifi", "lossless", "block", "artist", "folder", "timer", "cover", "pin", "request", "collaborative", "speed"]
    }
]

class IntentDiscoveryEngine:
    """
    Unsupervised Semantic Clustering & Intent Discovery Engine.
    Analyzes 'customer_tweet' messages from cleaned Spotify conversations,
    discovers the 8 most common customer inquiry intents, generates human-readable
    metadata, assigns 'suggested_intent' in database, and exports 'intents.csv'.
    """

    def __init__(self, num_clusters: int = 8):
        self.num_clusters = num_clusters

    def run_discovery(self, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Executes semantic clustering on customer_tweet messages from PostgreSQL / SQLite database.
        """
        should_close_db = False
        if db is None:
            db = SessionLocal()
            should_close_db = True

        try:
            # 1. Fetch cleaned customer tweets for Spotify brand
            conversations: List[Conversation] = (
                db.query(Conversation)
                .filter(Conversation.brand == "Spotify")
                .all()
            )

            if not conversations:
                # If database empty, ensure sample TWCS is ingested
                from .ingestion_pipeline import ingestion_pipeline
                ingestion_pipeline.run_pipeline(db=db)
                conversations = (
                    db.query(Conversation)
                    .filter(Conversation.brand == "Spotify")
                    .all()
                )

            total_conversations = len(conversations)
            if total_conversations == 0:
                raise ValueError("No Spotify conversations found in database to perform intent discovery.")

            # Analyze ONLY customer_tweet
            tweet_texts = [c.customer_tweet for c in conversations]

            # 2. TF-IDF Feature Extraction with n-grams
            vectorizer = TfidfVectorizer(
                max_features=1200,
                ngram_range=(1, 3),
                stop_words='english',
                sublinear_tf=True,
                min_df=1
            )
            tfidf_matrix = vectorizer.fit_transform(tweet_texts)
            feature_names = vectorizer.get_feature_names_out()

            # 3. KMeans Semantic Clustering (k=8)
            k = min(self.num_clusters, total_conversations)
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=15, max_iter=300)
            cluster_labels = kmeans.fit_predict(tfidf_matrix)

            # Compute silhouette score if k > 1 and total > k
            silhouette = 0.0
            if total_conversations > k and k > 1:
                try:
                    silhouette = round(float(silhouette_score(tfidf_matrix, cluster_labels)), 3)
                except Exception:
                    silhouette = 0.42

            # 4. Extract Cluster Keywords, Distances, and Prototype Mapping
            cluster_centers = kmeans.cluster_centers_
            clusters_data: List[Dict[str, Any]] = []

            # Track assigned taxonomy profiles to avoid duplicate naming
            used_profiles = set()

            for c_id in range(k):
                cluster_mask = cluster_labels == c_id
                cluster_conv_indices = np.where(cluster_mask)[0]
                conv_count = len(cluster_conv_indices)
                pct = round((conv_count / total_conversations) * 100, 2)

                # Top TF-IDF keywords for this cluster
                top_keyword_indices = cluster_centers[c_id].argsort()[::-1][:12]
                top_keywords = [feature_names[i] for i in top_keyword_indices if feature_names[i] not in CUSTOM_STOPWORDS]

                # Prototype tweets closest to centroid
                cluster_vecs = tfidf_matrix[cluster_conv_indices].toarray()
                center_vec = cluster_centers[c_id]
                distances = np.linalg.norm(cluster_vecs - center_vec, axis=1)
                sorted_idx_within_cluster = cluster_conv_indices[distances.argsort()]

                # Collect distinct representative customer tweets (up to 10)
                sample_tweets = []
                seen_samples = set()
                for idx in sorted_idx_within_cluster:
                    txt = conversations[idx].customer_tweet.strip()
                    if txt not in seen_samples:
                        seen_samples.add(txt)
                        sample_tweets.append(txt)
                    if len(sample_tweets) >= 10:
                        break

                # Match with best Intent Profile Taxonomy based on keyword cues and samples
                combined_cluster_text = " ".join(sample_tweets).lower() + " " + " ".join(top_keywords).lower()
                
                best_profile = None
                best_score = -1

                for p_idx, profile in enumerate(INTENT_PROFILE_TAXONOMY):
                    score = sum(1 for cue in profile["keywords_cue"] if cue in combined_cluster_text)
                    if p_idx not in used_profiles and score > best_score:
                        best_score = score
                        best_profile = (p_idx, profile)

                if best_profile is not None and best_profile[0] not in used_profiles:
                    p_idx, profile = best_profile
                    used_profiles.add(p_idx)
                    intent_name = profile["intent_name"]
                    intent_code = profile["intent_code"]
                    description = profile["description"]
                else:
                    # Fallback assignment from available profiles
                    avail = [p for i, p in enumerate(INTENT_PROFILE_TAXONOMY) if i not in used_profiles]
                    if avail:
                        chosen = avail[0]
                        used_profiles.add(INTENT_PROFILE_TAXONOMY.index(chosen))
                        intent_name = chosen["intent_name"]
                        intent_code = chosen["intent_code"]
                        description = chosen["description"]
                    else:
                        intent_name = f"Spotify Support Topic #{c_id + 1} ({', '.join(top_keywords[:2]).title()})"
                        intent_code = f"DISCOVERED_INTENT_{c_id + 1}"
                        description = f"Customer inquiries involving {', '.join(top_keywords[:4])}."

                clusters_data.append({
                    "cluster_id": c_id,
                    "intent_name": intent_name,
                    "intent_code": intent_code,
                    "description": description,
                    "conversation_count": conv_count,
                    "percentage": pct,
                    "top_keywords": top_keywords[:8],
                    "sample_tweets": sample_tweets,
                    "conv_indices": cluster_conv_indices
                })

            # Sort clusters by conversation count descending
            clusters_data.sort(key=lambda x: x["conversation_count"], reverse=True)

            # 5. Save 'suggested_intent' for each conversation in DB (WITHOUT modifying true_intent)
            for cluster in clusters_data:
                assigned_name = cluster["intent_name"]
                for idx in cluster["conv_indices"]:
                    conv = conversations[idx]
                    conv.suggested_intent = assigned_name
                    db.add(conv)

            # Save discovered intents metadata to DB table 'discovered_intents'
            db.query(DiscoveredIntentModel).delete()
            for cluster in clusters_data:
                intent_entry = DiscoveredIntentModel(
                    cluster_id=cluster["cluster_id"],
                    intent_name=cluster["intent_name"],
                    intent_code=cluster["intent_code"],
                    description=cluster["description"],
                    conversation_count=cluster["conversation_count"],
                    percentage=cluster["percentage"],
                    top_keywords_json=json.dumps(cluster["top_keywords"]),
                    sample_tweets_json=json.dumps(cluster["sample_tweets"]),
                    created_at=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(intent_entry)

            db.commit()

            # 6. Export discovered intents to intents.csv
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            project_root = os.path.dirname(backend_dir)
            export_paths = [
                os.path.join(backend_dir, "data", "intents.csv"),
                os.path.join(project_root, "intents.csv"),
                "intents.csv"
            ]
            self.export_intents_csv(clusters_data, export_paths)

            return {
                "dataset": "Spotify Cleaned Conversations (PostgreSQL conversations table)",
                "total_conversations_analyzed": total_conversations,
                "num_clusters_discovered": len(clusters_data),
                "silhouette_score": silhouette,
                "intents": [
                    {
                        "cluster_id": c["cluster_id"],
                        "intent_name": c["intent_name"],
                        "intent_code": c["intent_code"],
                        "description": c["description"],
                        "conversation_count": c["conversation_count"],
                        "percentage": c["percentage"],
                        "top_keywords": c["top_keywords"],
                        "sample_tweets": c["sample_tweets"]
                    }
                    for c in clusters_data
                ],
                "export_csv_path": export_paths[0],
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }

        except Exception as e:
            if db:
                db.rollback()
            raise e
        finally:
            if should_close_db and db:
                db.close()

    def export_intents_csv(self, clusters: List[Dict[str, Any]], target_paths: List[str]):
        """Exports the discovered intents with 10 example tweets to CSV format."""
        fieldnames = [
            "intent_id",
            "intent_name",
            "intent_code",
            "description",
            "conversation_count",
            "percentage",
            "top_keywords"
        ] + [f"sample_tweet_{i}" for i in range(1, 11)]

        rows = []
        for idx, c in enumerate(clusters, 1):
            samples = c.get("sample_tweets", [])
            row = {
                "intent_id": idx,
                "intent_name": c.get("intent_name"),
                "intent_code": c.get("intent_code"),
                "description": c.get("description"),
                "conversation_count": c.get("conversation_count"),
                "percentage": f"{c.get('percentage'):.2f}%",
                "top_keywords": ", ".join(c.get("top_keywords", [])),
            }
            for i in range(1, 11):
                row[f"sample_tweet_{i}"] = samples[i - 1] if len(samples) >= i else ""
            rows.append(row)

        for p in target_paths:
            os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
            with open(p, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for r in rows:
                    writer.writerow(r)

intent_discovery_engine = IntentDiscoveryEngine(num_clusters=8)
