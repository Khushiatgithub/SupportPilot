#!/usr/bin/env python3
"""
=============================================================================
Spotify Customer Support - Intent Discovery CLI
=============================================================================
This script performs unsupervised semantic clustering on cleaned Spotify
'customer_tweet' data stored in the database:
1. Clusters tweets into the 8 most common customer inquiry intents.
2. Generates human-readable intent names and descriptions.
3. Assigns 'suggested_intent' to conversations without modifying 'true_intent'.
4. Displays intent distribution, percentages, and 10 example tweets per intent.
5. Exports results to 'intents.csv'.

Usage:
    python backend/discover_intents.py
    python backend/discover_intents.py --db-url postgresql://user:pass@localhost:5432/dbname
=============================================================================
"""

import sys
import os
import argparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import Base, Conversation
from app.database import ensure_schema_columns
from app.services.intent_discovery import intent_discovery_engine
from app.config import settings

def print_banner():
    print("=" * 80)
    print("   HIVER AI SUPPORT AGENT - SPOTIFY INTENT DISCOVERY MODULE")
    print("   (Unsupervised Semantic Clustering & Intent Taxonomy Engine)")
    print("=" * 80)

def print_report(report: dict):
    print("\n" + "-" * 80)
    print("                     DISCOVERED INTENT CLUSTERS (k=8)")
    print("-" * 80)
    print(f"  Dataset Source                : {report.get('dataset')}")
    print(f"  Total Conversations Analyzed  : {report.get('total_conversations_analyzed')}")
    print(f"  Total Clusters Discovered     : {report.get('num_clusters_discovered')}")
    print(f"  Clustering Silhouette Score   : {report.get('silhouette_score')}")
    print(f"  Exported CSV File Path        : {report.get('export_csv_path')}")
    print("-" * 80)

    intents = report.get("intents", [])
    print("\n" + "=" * 80)
    print(f" {'ID':<4} | {'DISCOVERED INTENT NAME':<44} | {'COUNT':<6} | {'SHARE':<8}")
    print("=" * 80)
    for idx, item in enumerate(intents, 1):
        print(f" #{idx:<3} | {item['intent_name']:<44} | {item['conversation_count']:<6} | {item['percentage']:.2f}%")
        print(f"       Description: {item['description']}")
        print(f"       Keywords   : {', '.join(item['top_keywords'])}")
        print("       " + "-" * 70)

    print("\n" + "=" * 80)
    print("   REPRESENTATIVE EXAMPLE TWEETS PER INTENT (UP TO 10 EXAMPLES)")
    print("=" * 80)
    for idx, item in enumerate(intents, 1):
        print(f"\n[INTENT #{idx}] {item['intent_name']} ({item['conversation_count']} conversations, {item['percentage']:.2f}%)")
        print(f"Description: {item['description']}")
        samples = item.get("sample_tweets", [])
        for s_idx, tweet in enumerate(samples[:10], 1):
            print(f"   ({s_idx:02d}) \"{tweet}\"")
        print("   " + "-" * 72)

def main():
    parser = argparse.ArgumentParser(description="Run Intent Discovery on cleaned Spotify customer tweets")
    parser.add_argument("--db-url", type=str, default=None, help="Database connection URL (PostgreSQL or SQLite)")
    args = parser.parse_args()

    print_banner()

    db_url = args.db_url or settings.DATABASE_URL
    print(f"[*] Database URL: {db_url}")

    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    engine = create_engine(db_url, connect_args=connect_args)
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)
    Session = sessionmaker(bind=engine)
    db_session = Session()

    try:
        print("[*] Performing TF-IDF feature extraction and KMeans semantic clustering...")
        report = intent_discovery_engine.run_discovery(db=db_session)
        print_report(report)
        print("\n[OK] Intent discovery completed. Discovered intents exported to 'intents.csv'.")
    except Exception as e:
        print(f"\n[!] Intent discovery failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db_session.close()

if __name__ == "__main__":
    main()
