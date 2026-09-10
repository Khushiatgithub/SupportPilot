import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import Tweet, Ticket, HistoricalConversation, EvaluationBenchmark, BrandSettings
from app.seed_data import seed_database
from app.services.intent_classifier import intent_classifier
from app.services.sentiment_analyzer import sentiment_analyzer
from app.services.decision_engine import decision_engine
from app.services.evaluator import evaluator_service

def test_full_pipeline():
    print("1. Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    print("2. Seeding database...")
    db = SessionLocal()
    seed_database(db)
    
    print(f"   Tweets count: {db.query(Tweet).count()}")
    print(f"   Tickets count: {db.query(Ticket).count()}")
    print(f"   Historical convs count: {db.query(HistoricalConversation).count()}")
    print(f"   Benchmarks count: {db.query(EvaluationBenchmark).count()}")
    
    print("3. Testing Intent Classifier...")
    test_texts = [
        "Charged twice on my credit card for invoice #9921!",
        "Our entire dashboard is returning 500 internal server error",
        "Can you add dark mode and keyboard shortcuts to the app?",
        "I demand to speak with a manager immediately! Total scam!",
        "How do I reset my password and 2FA authentication?"
    ]
    for t in test_texts:
        intent, conf, probs, sub_intent, entities = intent_classifier.predict(t)
        sent_score, sent_label, urg_score, risk_score = sentiment_analyzer.analyze(t)
        decision, is_esc, reasons, calc_risk = decision_engine.evaluate(
            tweet_text=t,
            author_handle="@test_user",
            follower_count=200,
            is_verified=False,
            intent=intent,
            confidence=conf,
            sentiment_score=sent_score,
            sentiment_label=sent_label,
            urgency_score=urg_score,
            risk_score=risk_score,
            entities=entities,
            brand_settings=db.query(BrandSettings).first()
        )
        print(f"   Tweet: '{t[:40]}...' -> Intent: {intent} ({conf*100:.1f}%) | Sentiment: {sent_label} | Decision: {decision}")
        
    print("4. Testing Evaluator Benchmark...")
    report = evaluator_service.run_benchmark(db.query(BrandSettings).first())
    print(f"   Benchmark Accuracy: {report['accuracy']*100:.1f}% | F1: {report['f1_macro']*100:.1f}% | Samples: {report['sample_size']}")
    print(f"   Auto-Handle Rate: {report['auto_handle_rate']*100:.1f}% | Latency: {report['avg_latency_ms']:.1f}ms")
    
    db.close()
    print("SUCCESS: All backend tests passed!")

if __name__ == "__main__":
    test_full_pipeline()
