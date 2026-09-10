-- =============================================================================
-- PostgreSQL Schema for Twitter Customer Support System
-- Tables: conversations, intents, predictions
-- Features: Foreign Key Relationships, Constraints, B-Tree & Full-Text Indexes
-- =============================================================================

-- Enable extension for UUID generation (if needed in future)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. INTENTS TABLE
-- Defines the taxonomy of customer inquiry intents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intents (
    id SERIAL PRIMARY KEY,
    intent_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. CONVERSATIONS TABLE
-- Stores raw historical and incoming Twitter customer support interactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id VARCHAR(64) PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    customer_tweet TEXT NOT NULL,
    agent_reply TEXT,
    is_customer BOOLEAN DEFAULT TRUE NOT NULL,
    true_intent VARCHAR(100),
    suggested_intent VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2.1 INGESTION_REPORTS TABLE
-- Stores audit and cleaning logs from Kaggle TWCS pipeline runs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_reports (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(128) NOT NULL,
    brand VARCHAR(64) NOT NULL DEFAULT 'Spotify',
    total_raw_rows INTEGER NOT NULL DEFAULT 0,
    rows_removed INTEGER NOT NULL DEFAULT 0,
    final_cleaned_conversations INTEGER NOT NULL DEFAULT 0,
    percentage_retained NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    removed_breakdown_json TEXT DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2.2 DISCOVERED_INTENTS TABLE
-- Stores discovered customer support intent clusters from unsupervised analysis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discovered_intents (
    id SERIAL PRIMARY KEY,
    cluster_id INTEGER UNIQUE NOT NULL,
    intent_name VARCHAR(100) UNIQUE NOT NULL,
    intent_code VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    conversation_count INTEGER DEFAULT 0 NOT NULL,
    percentage NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    top_keywords_json TEXT DEFAULT '[]',
    sample_tweets_json TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. PREDICTIONS TABLE
-- Stores AI classification, reply generation, decision engine output, & confidence
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL,
    predicted_intent VARCHAR(100) NOT NULL,
    generated_reply TEXT,
    escalation BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_reason TEXT,
    confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0.0000 AND confidence <= 1.0000),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Key Constraints
    CONSTRAINT fk_predictions_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(conversation_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_predictions_intent
        FOREIGN KEY (predicted_intent)
        REFERENCES intents(intent_name)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- =============================================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- =============================================================================

-- Indexes for 'conversations'
CREATE INDEX IF NOT EXISTS idx_conversations_brand 
    ON conversations (brand);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
    ON conversations (created_at DESC);

-- Full-Text Search index for customer tweet text
CREATE INDEX IF NOT EXISTS idx_conversations_customer_tweet_gin 
    ON conversations USING gin(to_tsvector('english', customer_tweet));

-- Indexes for 'intents'
CREATE INDEX IF NOT EXISTS idx_intents_name 
    ON intents (intent_name);

-- Indexes for 'predictions'
CREATE INDEX IF NOT EXISTS idx_predictions_conversation_id 
    ON predictions (conversation_id);

CREATE INDEX IF NOT EXISTS idx_predictions_predicted_intent 
    ON predictions (predicted_intent);

CREATE INDEX IF NOT EXISTS idx_predictions_escalation 
    ON predictions (escalation);

CREATE INDEX IF NOT EXISTS idx_predictions_confidence 
    ON predictions (confidence);

CREATE INDEX IF NOT EXISTS idx_predictions_triage_lookup 
    ON predictions (escalation, confidence, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_created_at 
    ON predictions (created_at DESC);

-- =============================================================================
-- SAMPLE SEED DATA (OPTIONAL)
-- =============================================================================

INSERT INTO intents (intent_name, description) VALUES
    ('BILLING_REFUND', 'Inquiries regarding charges, invoices, duplicate debits, and refund processing.'),
    ('TECHNICAL_ISSUE', 'Reports of bugs, error codes, service degradation, or system crashes.'),
    ('ACCOUNT_ACCESS', 'Issues with 2FA, password resets, locked accounts, and authentication.'),
    ('ORDER_SHIPPING', 'Tracking delivery status, shipment delays, and dispatch inquiries.'),
    ('FEATURE_REQUEST', 'Product suggestions, feature enhancements, and integrations.'),
    ('CANCELLATION_CHURN', 'Subscription cancellations, account closures, and retention queries.'),
    ('ESCALATION_COMPLAINT', 'Severe dissatisfaction, complaints, and requests for managerial intervention.'),
    ('GENERAL_INQUIRY', 'General questions about pricing, business hours, and company policies.')
ON CONFLICT (intent_name) DO NOTHING;
