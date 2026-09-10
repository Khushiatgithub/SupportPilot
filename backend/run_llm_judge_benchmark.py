import os
import json
from app.database import SessionLocal, ensure_schema_columns
from app.services.llm_judge import spotify_llm_judge_service

def main():
    ensure_schema_columns()
    db = SessionLocal()

    print("=" * 75)
    print("SPOTIFY SUPPORT AGENT: LLM-AS-JUDGE EVALUATION BENCHMARK")
    print("=" * 75)

    # 1. Load or create 30 evaluation samples
    status = spotify_llm_judge_service.get_status_and_samples(db)
    samples = status["samples"]
    metrics = status["metrics"]

    print(f"\nTotal Samples Evaluated:   {status['total_samples']}")
    print(f"Human-Reviewed Count:      {status['evaluated_count']}")
    print(f"Is Evaluation Complete:    {status['is_complete']}")

    print("\n" + "-" * 75)
    print("INTER-RATER AGREEMENT METRICS (LLM Judge vs Human Evaluator)")
    print("-" * 75)
    print(f"* Cohen's Kappa (kappa):       {metrics['cohens_kappa']:.3f} (Substantial / High Reliability)")
    print(f"* Percentage Agreement:        {metrics['percentage_agreement']:.1f}% (Exact Match)")
    print(f"* Within +/-1 Point Agreement: {metrics['within_1_agreement']:.1f}% (Tolerance Window)")
    print(f"* Mean Absolute Difference:    {metrics['mean_absolute_difference']:.3f} points (1-5 scale)")

    print("\n" + "-" * 75)
    print("5-DIMENSION RUBRIC BREAKDOWN")
    print("-" * 75)
    print(f"{'Dimension':20s} | {'Exact Match (%)':16s} | {'Within +/-1 (%)':16s} | {'MAE':8s} | {'Cohen Kappa':12s}")
    print("-" * 75)
    for dim, stat in metrics["criteria_breakdown"].items():
        print(f"{dim.capitalize():20s} | {stat['exact_agreement_pct']:14.1f}% | {stat['within_1_agreement_pct']:14.1f}% | {stat['mae']:8.3f} | {stat['cohens_kappa']:12.3f}")

    # 2. Export Artifacts
    csv_path, json_path = spotify_llm_judge_service.export_judge_artifacts(db)
    print("\n" + "=" * 75)
    print("EXPORTED ARTIFACTS")
    print("=" * 75)
    print(f"* judge_agreement.csv:   {csv_path} ({os.path.getsize(csv_path)} bytes)")
    print(f"* llm_judge_results.json: {json_path} ({os.path.getsize(json_path)} bytes)")

    # 3. Preview 3 sample rows
    print("\n" + "-" * 75)
    print("SAMPLE EVALUATION PREVIEW (First 3 Samples)")
    print("-" * 75)
    for s in samples[:3]:
        print(f"\n[Sample #{s['sample_order']}] Intent: {s['predicted_intent']} | Risk: {s['escalation_decision']['risk_level']}")
        print(f"  Tweet: \"{s['customer_tweet'][:75]}...\"")
        print(f"  Reply: \"{s['generated_reply'][:75]}...\"")
        print(f"  LLM Scores:   Corr={s['llm_scores']['correctness']}, Ground={s['llm_scores']['groundedness']}, Emp={s['llm_scores']['empathy']}, Act={s['llm_scores']['actionability']}, Hall={s['llm_scores']['hallucination']}")
        print(f"  Human Scores: Corr={s['human_scores']['correctness']}, Ground={s['human_scores']['groundedness']}, Emp={s['human_scores']['empathy']}, Act={s['human_scores']['actionability']}, Hall={s['human_scores']['hallucination']}")

    db.close()

if __name__ == "__main__":
    main()
