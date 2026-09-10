export interface Tweet {
  id: number;
  tweet_id: string;
  author_handle: string;
  author_name: string;
  content: string;
  follower_count: number;
  is_verified: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  conversation_id?: string;
  tweet_id: number;
  customer_tweet?: string;
  agent_reply?: string;
  suggested_intent?: string;
  true_intent?: string | null;
  intent: string;
  sub_intent: string;
  intent_confidence: number;
  sentiment_score: number;
  sentiment_label: 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
  urgency_score: number;
  risk_score: number;
  status: 'AUTO_HANDLED' | 'ESCALATED' | 'PENDING_REVIEW' | 'RESOLVED' | 'REJECTED';
  is_escalated: boolean;
  is_auto_handled: boolean;
  escalation_reasons: string[];
  drafted_reply: string;
  final_reply: string;
  response_tone: string;
  matched_precedents: Array<{
    id: number;
    similarity_score: number;
    brand: string;
    incoming_tweet: string;
    agent_reply: string;
    intent: string;
    quality_score: number;
  }>;
  agent_notes: string;
  handling_time_ms: number;
  created_at: string;
  updated_at: string;
  tweet?: Tweet;
}


export interface InboxStats {
  total_tickets: number;
  auto_handled: number;
  escalated: number;
  pending_review: number;
  resolved: number;
  automation_rate_pct: number;
}

export interface ClassifyStepTrace {
  step_name: string;
  status: string;
  duration_ms: number;
  output_summary: string;
  details: Record<string, any>;
}

export interface ClassifyResponse {
  intent: string;
  sub_intent: string;
  intent_confidence: number;
  all_intent_probabilities: Record<string, number>;
  sentiment_score: number;
  sentiment_label: 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
  urgency_score: number;
  risk_score: number;
  entities_extracted: {
    order_ids: string[];
    amounts: string[];
    error_codes: string[];
    emails: string[];
    handles: string[];
  };
  decision: 'AUTO_HANDLE' | 'ESCALATE';
  is_escalated: boolean;
  escalation_reasons: string[];
  draft_reply: string;
  matched_historical_replies: Array<{
    id: number;
    similarity_score: number;
    brand: string;
    incoming_tweet: string;
    agent_reply: string;
    intent: string;
  }>;
  execution_trace: ClassifyStepTrace[];
  handling_time_ms: number;
}

export interface ConfusionMatrixCell {
  actual: string;
  predicted: string;
  count: number;
  percentage: number;
}

export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][];
  cell_details: ConfusionMatrixCell[];
}

export interface ClassMetric {
  intent: string;
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface MisclassifiedSample {
  id: number;
  tweet_text: string;
  actual_intent: string;
  predicted_intent: string;
  confidence: number;
  sentiment: string;
  error_type: string;
}

export interface EvaluationReport {
  id?: number;
  name: string;
  model_type: string;
  sample_size: number;
  accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  auto_handle_rate: number;
  escalation_precision: number;
  false_auto_resolve_rate: number;
  avg_latency_ms: number;
  confusion_matrix: ConfusionMatrixData;
  per_class_metrics: ClassMetric[];
  misclassified_samples: MisclassifiedSample[];
  created_at: string;
}

export interface HistoricalConversation {
  id: number;
  brand: string;
  customer_handle: string;
  incoming_tweet: string;
  agent_reply: string;
  intent: string;
  quality_score: number;
  category: string;
  resolution_status: string;
  created_at: string;
}

export interface BrandSettings {
  brand_name: string;
  brand_handle: string;
  default_tone: string;
  auto_handle_threshold: number;
  escalation_sentiment_threshold: number;
  refund_amount_limit: number;
  vip_handles: string[];
  banned_keywords: string[];
  escalation_rules: Record<string, boolean>;
  auto_reply_enabled: boolean;
  updated_at: string;
}

export interface CleanedConversation {
  conversation_id: string;
  brand: string;
  customer_tweet: string;
  agent_reply: string;
  is_customer: boolean;
  true_intent?: string;
  suggested_intent?: string;
  created_at: string;
}

export interface IngestionReportData {
  dataset_name: string;
  brand: string;
  file_source?: string;
  total_raw_rows: number;
  rows_removed: number;
  final_cleaned_conversations: number;
  percentage_retained: number;
  removed_breakdown: {
    non_spotify_brand_rows?: number;
    unresolved_conversations_no_reply?: number;
    empty_or_deleted_messages?: number;
    duplicate_threads?: number;
    [key: string]: number | undefined;
  };
  preview_conversations: CleanedConversation[];
  created_at: string;
}

export interface DiscoveredIntent {
  cluster_id: number;
  intent_name: string;
  intent_code: string;
  description: string;
  conversation_count: number;
  percentage: number;
  top_keywords: string[];
  sample_tweets: string[];
}

export interface IntentDiscoveryReport {
  dataset: string;
  total_conversations_analyzed: number;
  num_clusters_discovered: number;
  silhouette_score: number;
  intents: DiscoveredIntent[];
  export_csv_path: string;
  created_at: string;
}

export interface IntentConversationItem {
  conversation_id: string;
  brand: string;
  customer_tweet: string;
  agent_reply?: string;
  is_customer: boolean;
  true_intent?: string;
  suggested_intent: string;
  created_at: string;
}

export interface IntentConversationsResponse {
  total: number;
  limit: number;
  offset: number;
  conversations: IntentConversationItem[];
}

// =============================================================================
// PRODUCTION INTENT CLASSIFICATION TYPES
// =============================================================================

export interface PredictIntentRequest {
  customer_tweet: string;
}

export interface TopIntentItem {
  intent: string;
  intent_code?: string;
  confidence: number;
  badge_color?: string;
}

export interface PredictIntentResponse {
  predicted_intent: string;
  intent_code?: string;
  confidence: number;
  description?: string;
  badge_color?: string;
  top_3_intents: TopIntentItem[];
  latency_ms: number;
  model_name?: string;
}

export interface PerIntentMetric {
  intent_name: string;
  intent_code: string;
  badge_color: string;
  description: string;
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface BaselineModelEvaluation {
  model_name: string;
  accuracy: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
  confusion_matrix: number[][];
  labels: string[];
}

export interface FinalModelEvaluation {
  model_name: string;
  accuracy: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
  confusion_matrix: number[][];
  labels: string[];
  per_intent_table: PerIntentMetric[];
}

export interface ClassifierEvaluationReport {
  dataset_info: {
    name: string;
    total_conversations: number;
    train_samples: number;
    test_samples: number;
    split_ratio: string;
    num_classes: number;
  };
  baseline_model: BaselineModelEvaluation;
  final_model: FinalModelEvaluation;
  generated_at: string;
}

export interface SavedPrediction {
  id: number;
  customer_tweet: string;
  predicted_intent: string;
  confidence: number;
  top_3_intents: TopIntentItem[];
  model_name: string;
  latency_ms: number;
  created_at: string;
}

export interface SavedPredictionsResponse {
  total: number;
  limit: number;
  offset: number;
  predictions: SavedPrediction[];
}

// =============================================================================
// GOLDEN SET ANNOTATION TYPES
// =============================================================================

export interface GoldenSetAvailableIntent {
  intent_id: number;
  intent_code: string;
  intent_name: string;
  description: string;
  badge_color: string;
  hotkey: string;
}

export interface GoldenSetItem {
  sample_order: number;
  conversation_id: string;
  customer_tweet: string;
  agent_reply: string;
  suggested_intent: string;
  true_intent: string | null;
  is_annotated: boolean;
  created_at: string;
}

export interface GoldenSetStatusResponse {
  total_samples: number;
  annotated_count: number;
  remaining_count: number;
  progress_pct: number;
  is_complete: boolean;
  available_intents: GoldenSetAvailableIntent[];
  items: GoldenSetItem[];
}

export interface SaveAnnotationRequest {
  conversation_id: string;
  true_intent: string;
}

export interface SaveAnnotationResponse {
  success: boolean;
  conversation_id: string;
  true_intent: string;
  suggested_intent: string;
  annotated_count: number;
  remaining_count: number;
  total_samples: number;
  progress_pct: number;
  is_complete: boolean;
}

export interface InboxConversationsResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  stats: InboxStats;
  conversations: Ticket[];
}

// =============================================================================
// RAG REPLY GENERATOR TYPES
// =============================================================================

export interface RetrievedConversation {
  rank: number;
  conversation_id: string;
  customer_tweet: string;
  agent_reply: string;
  intent: string;
  suggested_intent?: string;
  true_intent?: string;
  similarity_score: number;
}

export interface RagReplyResponse {
  customer_tweet: string;
  generated_reply: string;
  predicted_intent: string;
  confidence: number;
  retrieved_conversations: RetrievedConversation[];
  latency_ms: number;
  guardrails_passed: boolean;
  prediction_id?: number;
  model_name?: string;
}

// =============================================================================
// ESCALATION DECISION ENGINE TYPES
// =============================================================================

export interface DecideEscalationRequest {
  customer_tweet: string;
  predicted_intent: string;
  confidence: number;
  generated_reply?: string;
  retrieved_similarity_score?: number;
}

export interface DecideEscalationResponse {
  customer_tweet: string;
  predicted_intent: string;
  confidence: number;
  auto_handle: boolean;
  escalation: boolean;
  escalation_reason: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  rule_triggered?: string;
  prediction_id?: number;
  generated_reply?: string;
}

// =============================================================================
// LLM-AS-JUDGE EVALUATION TYPES
// =============================================================================

export interface LLMJudgeScores {
  correctness: number;
  groundedness: number;
  empathy: number;
  actionability: number;
  hallucination: 'PASS' | 'FAIL';
  reasoning: string;
}

export interface HumanJudgeScores {
  correctness: number | null;
  groundedness: number | null;
  empathy: number | null;
  actionability: number | null;
  hallucination: 'PASS' | 'FAIL' | null;
  notes: string;
}

export interface JudgeCriterionMetrics {
  exact_agreement_pct: number;
  within_1_agreement_pct: number;
  mae: number;
  cohens_kappa: number;
}

export interface JudgeAgreementMetrics {
  cohens_kappa: number;
  percentage_agreement: number;
  within_1_agreement: number;
  mean_absolute_difference: number;
  total_evaluated_samples: number;
  criteria_breakdown: Record<string, JudgeCriterionMetrics>;
}

export interface LLMJudgeSample {
  id: number;
  sample_order: number;
  prediction_id?: number;
  customer_tweet: string;
  generated_reply: string;
  predicted_intent: string;
  escalation_decision: {
    auto_handle: boolean;
    escalation: boolean;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    escalation_reason: string;
  };
  retrieved_context: RetrievedConversation[];
  llm_scores: LLMJudgeScores;
  human_scores: HumanJudgeScores;
  is_human_evaluated: boolean;
  created_at: string;
}

export interface LLMJudgeStatusResponse {
  total_samples: number;
  evaluated_count: number;
  is_complete: boolean;
  metrics: JudgeAgreementMetrics;
  samples: LLMJudgeSample[];
}

export interface SaveHumanJudgeScoreRequest {
  sample_order: number;
  correctness: number;
  groundedness: number;
  empathy: number;
  actionability: number;
  hallucination: 'PASS' | 'FAIL';
  notes?: string;
}

export interface SaveHumanJudgeScoreResponse {
  success: boolean;
  sample_order: number;
  metrics: JudgeAgreementMetrics;
}


