#!/usr/bin/env python3
"""
=============================================================================
Kaggle Customer Support on Twitter (TWCS) - Spotify Ingestion CLI
=============================================================================
This script provides a standalone command-line interface to:
1. Ingest Kaggle 'twcs.csv' into PostgreSQL (or SQLite).
2. Filter for the Spotify brand (@SpotifyCares).
3. Reconstruct customer-agent conversation threads.
4. Remove deleted, empty, duplicate, and unresolved messages.
5. Populate the 'conversations' and 'ingestion_reports' tables.
6. Print the audit cleaning report and display the first 20 conversations.

Usage:
    python backend/ingest_twcs.py --csv path/to/twcs.csv --db-url postgresql://user:pass@localhost:5432/dbname
    python backend/ingest_twcs.py --preview-limit 20
=============================================================================
"""

import sys
import os
import argparse
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import Base, Conversation, IngestionReport
from app.database import ensure_schema_columns
from app.services.ingestion_pipeline import ingestion_pipeline
from app.config import settings

def print_banner():
    print("=" * 75)
    print("   HIVER AI SUPPORT AGENT - KAGGLE TWCS SPOTIFY INGESTION PIPELINE")
    print("=" * 75)

def format_report_table(report: dict):
    print("\n" + "-" * 75)
    print("                     INGESTION & CLEANING AUDIT REPORT")
    print("-" * 75)
    print(f"  Dataset Name               : {report.get('dataset_name')}")
    print(f"  Target Brand               : {report.get('brand')}")
    print(f"  Source File                : {report.get('file_source')}")
    print(f"  Total Raw Rows Processed   : {report.get('total_raw_rows'):,}")
    print(f"  Rows Removed (Filtered)    : {report.get('rows_removed'):,}")
    print(f"  Final Cleaned Conversations: {report.get('final_cleaned_conversations'):,}")
    print(f"  Retention Rate             : {report.get('percentage_retained'):.2f}%")
    print("-" * 75)
    
    breakdown = report.get("removed_breakdown", {})
    print("  REMOVAL BREAKDOWN:")
    print(f"    * Non-Spotify Brand Rows     : {breakdown.get('non_spotify_brand_rows', 0):,}")
    print(f"    * Unresolved (No Agent Reply): {breakdown.get('unresolved_conversations_no_reply', 0):,}")
    print(f"    * Corrupted / Deleted / Empty: {breakdown.get('empty_or_deleted_messages', 0):,}")
    print(f"    * Duplicate Conversation Pairs: {breakdown.get('duplicate_threads', 0):,}")
    print("-" * 75)

def print_conversations_preview(preview: list):
    print("\n" + "=" * 75)
    print(f"   PREVIEW: FIRST {len(preview)} CLEANED CONVERSATIONS")
    print("=" * 75)
    
    for idx, c in enumerate(preview, 1):
        print(f"\n[{idx:02d}] Conversation ID: {c.get('conversation_id')} | Brand: {c.get('brand')} | Created: {c.get('created_at')}")
        print(f"     Intent : {c.get('true_intent')}")
        print(f"     Customer Tweet : {c.get('customer_tweet')}")
        print(f"     Spotify Reply  : {c.get('agent_reply')}")
        print("     " + "-" * 65)

def main():
    parser = argparse.ArgumentParser(description="Ingest and clean Kaggle TWCS dataset for Spotify")
    parser.add_argument("--csv", type=str, default=None, help="Path to twcs.csv file")
    parser.add_argument("--db-url", type=str, default=None, help="Database connection URL (PostgreSQL or SQLite)")
    parser.add_argument("--brand", type=str, default="Spotify", help="Brand name to filter (default: Spotify)")
    parser.add_argument("--handle", type=str, default="SpotifyCares", help="Brand handle (default: SpotifyCares)")
    parser.add_argument("--preview-limit", type=int, default=20, help="Number of preview conversations to display (default: 20)")
    
    args = parser.parse_args()
    print_banner()

    # Determine database URL
    db_url = args.db_url or settings.DATABASE_URL
    print(f"[*] Database URL: {db_url}")
    
    # Setup database connection
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    engine = create_engine(db_url, connect_args=connect_args)
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)
    Session = sessionmaker(bind=engine)
    db_session = Session()

    try:
        print("[*] Running Ingestion & Thread Reconstruction Pipeline...")
        report = ingestion_pipeline.run_pipeline(
            csv_file_path=args.csv,
            db=db_session,
            brand_filter=args.brand,
            brand_handle=args.handle
        )

        format_report_table(report)

        # Retrieve first N conversations
        preview_convs = report.get("preview_conversations", [])[:args.preview_limit]
        print_conversations_preview(preview_convs)

        print("\n[OK] Ingestion successfully completed and committed to database.")
    except Exception as e:
        print(f"\n[!] Pipeline execution error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db_session.close()

if __name__ == "__main__":
    main()
