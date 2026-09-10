import json
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import EvaluationBenchmark, BrandSettings
from ..schemas import EvaluationReport
from ..services.evaluator import evaluator_service

router = APIRouter(prefix="/evaluation", tags=["Evaluation & Benchmarks"])

def format_eval_benchmark(eb: EvaluationBenchmark) -> dict:
    cm = {}
    try:
        cm = json.loads(eb.confusion_matrix_json or "{}")
    except Exception:
        pass

    per_class = []
    try:
        per_class = json.loads(eb.per_class_metrics_json or "[]")
    except Exception:
        pass

    misclassified = []
    try:
        misclassified = json.loads(eb.misclassified_samples_json or "[]")
    except Exception:
        pass

    return {
        "id": eb.id,
        "name": eb.name,
        "model_type": eb.model_type,
        "sample_size": eb.sample_size,
        "accuracy": eb.accuracy,
        "precision_macro": eb.precision_macro,
        "recall_macro": eb.recall_macro,
        "f1_macro": eb.f1_macro,
        "auto_handle_rate": eb.auto_handle_rate,
        "escalation_precision": eb.escalation_precision,
        "false_auto_resolve_rate": eb.false_auto_resolve_rate,
        "avg_latency_ms": eb.avg_latency_ms,
        "confusion_matrix": cm,
        "per_class_metrics": per_class,
        "misclassified_samples": misclassified,
        "created_at": eb.created_at
    }

@router.get("/latest")
def get_latest_evaluation(db: Session = Depends(get_db)):
    eb = db.query(EvaluationBenchmark).order_by(desc(EvaluationBenchmark.created_at)).first()
    if not eb:
        # Run benchmark if none exists
        brand_settings = db.query(BrandSettings).first() or BrandSettings()
        report = evaluator_service.run_benchmark(brand_settings)
        eb = EvaluationBenchmark(
            name=report["name"],
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
        db.add(eb)
        db.commit()
        db.refresh(eb)

    return format_eval_benchmark(eb)

@router.post("/run")
def run_new_evaluation(db: Session = Depends(get_db)):
    brand_settings = db.query(BrandSettings).first() or BrandSettings()
    report = evaluator_service.run_benchmark(brand_settings)
    
    eb = EvaluationBenchmark(
        name=f"Interactive Evaluation Run #{db.query(EvaluationBenchmark).count() + 1}",
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
    db.add(eb)
    db.commit()
    db.refresh(eb)
    
    return format_eval_benchmark(eb)

@router.get("/history")
def get_evaluation_history(db: Session = Depends(get_db)):
    runs = db.query(EvaluationBenchmark).order_by(desc(EvaluationBenchmark.created_at)).limit(10).all()
    return [format_eval_benchmark(r) for r in runs]
