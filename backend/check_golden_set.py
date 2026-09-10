from app.database import SessionLocal
from app.services.golden_set import golden_set_service

db = SessionLocal()
status = golden_set_service.get_golden_set_status(db)
print(f"Total Samples: {status['total_samples']}")
print(f"Annotated Count: {status['annotated_count']}")
print(f"Remaining Count: {status['remaining_count']}")
print(f"Progress: {status['progress_pct']}%")

unannotated = [item for item in status['items'] if not item['is_annotated']]
print(f"Number of unannotated items: {len(unannotated)}")
db.close()
