import os
import csv
from collections import Counter
from app.database import SessionLocal
from app.services.golden_set import golden_set_service

db = SessionLocal()
status = golden_set_service.get_golden_set_status(db)

print("=" * 70)
print("GOLDEN SET 200-SAMPLE VERIFICATION & EXPORT")
print("=" * 70)

print(f"Total Samples:   {status['total_samples']}")
print(f"Annotated Count: {status['annotated_count']}")
print(f"Remaining Count: {status['remaining_count']}")
print(f"Progress:        {status['progress_pct']}%")
print(f"Is Complete:     {status['is_complete']}")

# Check intent distribution
intents_count = Counter(item['true_intent'] for item in status['items'])
print("\n--- True Intent Distribution Across 200 Samples ---")
for intent, count in intents_count.most_common():
    pct = (count / len(status['items'])) * 100
    print(f"  {intent:55s}: {count:3d} ({pct:5.1f}%)")

# Export golden_set.csv
exported_path = golden_set_service.export_golden_set_csv(db)
print(f"\nExported Golden Set CSV to: {exported_path}")

root_csv = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "golden_set.csv")
print(f"Root CSV exists: {os.path.exists(root_csv)} (Size: {os.path.getsize(root_csv) if os.path.exists(root_csv) else 0} bytes)")

# Preview first 5 rows of exported CSV
print("\n--- Preview First 5 Rows of golden_set.csv ---")
with open(root_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if i >= 5:
            break
        print(f"\nSample #{row['sample_number']} | Conv ID: {row['conversation_id']}")
        print(f"  Tweet:       {row['customer_tweet'][:80]}...")
        print(f"  Suggested:   {row['suggested_intent']}")
        print(f"  True Intent: {row['true_intent']}")

db.close()
