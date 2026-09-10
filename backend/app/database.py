from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

DATABASE_URL = settings.DATABASE_URL

# Handle sqlite specific connection args
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema_columns(engine_instance=None):
    """Ensures newly added columns exist in the database tables."""
    eng = engine_instance or engine
    with eng.connect() as conn:
        try:
            # Check for suggested_intent in conversations
            if eng.url.drivername.startswith("sqlite"):
                conn.exec_driver_sql("""
                    CREATE TABLE IF NOT EXISTS predictions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_tweet TEXT NOT NULL,
                        predicted_intent VARCHAR(100) NOT NULL,
                        confidence FLOAT NOT NULL,
                        top_3_json TEXT NOT NULL DEFAULT '[]',
                        model_name VARCHAR(100) DEFAULT 'Nearest Centroid (Sentence Embeddings)',
                        latency_ms FLOAT DEFAULT 0.0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.exec_driver_sql("""
                    CREATE TABLE IF NOT EXISTS golden_set_samples (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        conversation_id VARCHAR(64) UNIQUE NOT NULL,
                        sample_order INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.exec_driver_sql("""
                    CREATE TABLE IF NOT EXISTS llm_judge_evaluations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sample_order INTEGER UNIQUE NOT NULL,
                        prediction_id INTEGER,
                        customer_tweet TEXT NOT NULL,
                        generated_reply TEXT NOT NULL,
                        predicted_intent VARCHAR(100) DEFAULT 'General Inquiry',
                        escalation_decision_json TEXT DEFAULT '{}',
                        retrieved_context_json TEXT DEFAULT '[]',
                        llm_correctness INTEGER DEFAULT 5,
                        llm_groundedness INTEGER DEFAULT 5,
                        llm_empathy INTEGER DEFAULT 5,
                        llm_actionability INTEGER DEFAULT 5,
                        llm_hallucination VARCHAR(10) DEFAULT 'PASS',
                        llm_reasoning TEXT DEFAULT '',
                        human_correctness INTEGER,
                        human_groundedness INTEGER,
                        human_empathy INTEGER,
                        human_actionability INTEGER,
                        human_hallucination VARCHAR(10),
                        human_notes TEXT DEFAULT '',
                        is_human_evaluated BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                result = conn.exec_driver_sql("PRAGMA table_info(conversations)")
                columns = [row[1] for row in result.fetchall()]
                if columns and "suggested_intent" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN suggested_intent VARCHAR(100)")
                if columns and "is_customer" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN is_customer BOOLEAN DEFAULT 1")
                if columns and "true_intent" not in columns:
                    conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN true_intent VARCHAR(100)")

                pred_res = conn.exec_driver_sql("PRAGMA table_info(predictions)")
                pred_cols = [row[1] for row in pred_res.fetchall()]
                if pred_cols and "generated_reply" not in pred_cols:
                    conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN generated_reply TEXT")
                if pred_cols and "retrieved_context_json" not in pred_cols:
                    conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN retrieved_context_json TEXT")
                if pred_cols and "auto_handle" not in pred_cols:
                    conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN auto_handle BOOLEAN DEFAULT 1")
                if pred_cols and "escalation" not in pred_cols:
                    conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN escalation BOOLEAN DEFAULT 0")
                if pred_cols and "escalation_reason" not in pred_cols:
                    conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN escalation_reason TEXT")
                if pred_cols and "risk_level" not in pred_cols:
                    conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN risk_level VARCHAR(32) DEFAULT 'LOW'")
            else:
                conn.exec_driver_sql("""
                    CREATE TABLE IF NOT EXISTS predictions (
                        id SERIAL PRIMARY KEY,
                        customer_tweet TEXT NOT NULL,
                        predicted_intent VARCHAR(100) DEFAULT 'General Inquiry',
                        confidence FLOAT DEFAULT 0.9,
                        top_3_json TEXT NOT NULL DEFAULT '[]',
                        model_name VARCHAR(100) DEFAULT 'RAG Spotify Reply Generator (FAISS)',
                        latency_ms FLOAT DEFAULT 0.0,
                        generated_reply TEXT,
                        retrieved_context_json TEXT DEFAULT '[]',
                        auto_handle BOOLEAN DEFAULT TRUE,
                        escalation BOOLEAN DEFAULT FALSE,
                        escalation_reason TEXT,
                        risk_level VARCHAR(32) DEFAULT 'LOW',
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.exec_driver_sql("""
                    CREATE TABLE IF NOT EXISTS golden_set_samples (
                        id SERIAL PRIMARY KEY,
                        conversation_id VARCHAR(64) UNIQUE NOT NULL,
                        sample_order INTEGER NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.exec_driver_sql("""
                    CREATE TABLE IF NOT EXISTS llm_judge_evaluations (
                        id SERIAL PRIMARY KEY,
                        sample_order INTEGER UNIQUE NOT NULL,
                        prediction_id INTEGER,
                        customer_tweet TEXT NOT NULL,
                        generated_reply TEXT NOT NULL,
                        predicted_intent VARCHAR(100) DEFAULT 'General Inquiry',
                        escalation_decision_json TEXT DEFAULT '{}',
                        retrieved_context_json TEXT DEFAULT '[]',
                        llm_correctness INTEGER DEFAULT 5,
                        llm_groundedness INTEGER DEFAULT 5,
                        llm_empathy INTEGER DEFAULT 5,
                        llm_actionability INTEGER DEFAULT 5,
                        llm_hallucination VARCHAR(10) DEFAULT 'PASS',
                        llm_reasoning TEXT DEFAULT '',
                        human_correctness INTEGER,
                        human_groundedness INTEGER,
                        human_empathy INTEGER,
                        human_actionability INTEGER,
                        human_hallucination VARCHAR(10),
                        human_notes TEXT DEFAULT '',
                        is_human_evaluated BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS suggested_intent VARCHAR(100)")
                conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_customer BOOLEAN DEFAULT TRUE")
                conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS true_intent VARCHAR(100)")
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN IF NOT EXISTS generated_reply TEXT")
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN IF NOT EXISTS retrieved_context_json TEXT")
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN IF NOT EXISTS auto_handle BOOLEAN DEFAULT TRUE")
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN IF NOT EXISTS escalation BOOLEAN DEFAULT FALSE")
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN IF NOT EXISTS escalation_reason TEXT")
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN IF NOT EXISTS risk_level VARCHAR(32) DEFAULT 'LOW'")
            conn.commit()
        except Exception:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

