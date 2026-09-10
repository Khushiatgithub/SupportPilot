-- =============================================================================
-- Migration: 002_add_suggested_intent.sql
-- Description: Adds 'suggested_intent' column to conversations and creates discovered_intents table
-- =============================================================================

-- 1. Add suggested_intent column to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS suggested_intent VARCHAR(100) NULL;

-- 2. Create index on suggested_intent
CREATE INDEX IF NOT EXISTS idx_conversations_suggested_intent
    ON conversations (suggested_intent);

-- 3. Create discovered_intents table
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

CREATE INDEX IF NOT EXISTS idx_discovered_intents_code
    ON discovered_intents (intent_code);
