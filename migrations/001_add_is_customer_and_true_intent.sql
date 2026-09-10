-- =============================================================================
-- Migration: 001_add_is_customer_and_true_intent.sql
-- Description: Adds 'is_customer' and 'true_intent' columns with FK and index
-- Target Table: conversations
-- =============================================================================

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- 1. Add 'is_customer' column with default value TRUE
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_customer BOOLEAN DEFAULT TRUE NOT NULL;

-- 2. Add 'true_intent' column with foreign key reference to intents(intent_name)
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS true_intent VARCHAR(100) NULL;

-- 3. Add Foreign Key Constraint linking true_intent to intents taxonomy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_conversations_true_intent' 
          AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations
        ADD CONSTRAINT fk_conversations_true_intent
        FOREIGN KEY (true_intent)
        REFERENCES intents(intent_name)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Create indexes on newly added columns for fast querying & evaluation benchmarking
CREATE INDEX IF NOT EXISTS idx_conversations_true_intent
    ON conversations (true_intent);

CREATE INDEX IF NOT EXISTS idx_conversations_is_customer
    ON conversations (is_customer);

-- ==========================================
-- DOWN MIGRATION (ROLLBACK)
-- ==========================================
/*
DROP INDEX IF EXISTS idx_conversations_is_customer;
DROP INDEX IF EXISTS idx_conversations_true_intent;

ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS fk_conversations_true_intent;

ALTER TABLE conversations
DROP COLUMN IF EXISTS true_intent,
DROP COLUMN IF EXISTS is_customer;
*/
