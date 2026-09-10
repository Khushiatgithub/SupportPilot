import type {
  Ticket,
  InboxStats,
  InboxConversationsResponse,
  ClassifyResponse,
  EvaluationReport,
  HistoricalConversation,
  BrandSettings,
  CleanedConversation,
  IngestionReportData,
  IntentDiscoveryReport,
  IntentConversationsResponse
} from '../types';

const API_BASE = '/api';

export async function fetchInboxConversations(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  intent?: string;
  search?: string;
}): Promise<InboxConversationsResponse> {
  const url = new URL(`${window.location.origin}${API_BASE}/conversations/inbox`);
  if (params?.page) url.searchParams.append('page', params.page.toString());
  if (params?.page_size) url.searchParams.append('page_size', params.page_size.toString());
  if (params?.status && params.status !== 'ALL') url.searchParams.append('status', params.status);
  if (params?.intent && params.intent !== 'ALL') url.searchParams.append('intent', params.intent);
  if (params?.search) url.searchParams.append('search', params.search);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch inbox conversations');
  return res.json();
}

export async function fetchTickets(params?: {
  status?: string;
  intent?: string;
  search?: string;
}): Promise<Ticket[]> {
  try {
    const data = await fetchInboxConversations({ ...params, page: 1, page_size: 100 });
    return data.conversations;
  } catch {
    const url = new URL(`${window.location.origin}${API_BASE}/tickets`);
    if (params?.status && params.status !== 'ALL') url.searchParams.append('status', params.status);
    if (params?.intent && params.intent !== 'ALL') url.searchParams.append('intent', params.intent);
    if (params?.search) url.searchParams.append('search', params.search);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
  }
}

export async function fetchInboxStats(): Promise<InboxStats> {
  try {
    const res = await fetch(`${API_BASE}/conversations/stats`);
    if (res.ok) return res.json();
  } catch {}
  const res = await fetch(`${API_BASE}/tickets/stats`);
  if (!res.ok) throw new Error('Failed to fetch inbox stats');
  return res.json();
}


export async function fetchTicket(id: number): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/tickets/${id}`);
  if (!res.ok) throw new Error('Failed to fetch ticket');
  return res.json();
}

export async function updateTicket(
  id: number,
  data: { status?: string; final_reply?: string; agent_notes?: string; response_tone?: string }
): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update ticket');
  return res.json();
}

export async function approveTicketReply(
  id: number,
  data: { final_reply?: string; agent_notes?: string }
): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/tickets/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to approve ticket reply');
  return res.json();
}

export async function regenerateTicketReply(
  id: number,
  tone?: string
): Promise<Ticket> {
  const url = new URL(`${window.location.origin}${API_BASE}/tickets/${id}/regenerate-reply`);
  if (tone) url.searchParams.append('tone', tone);

  const res = await fetch(url.toString(), {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to regenerate reply');
  return res.json();
}

export async function simulateIncomingTweet(): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/tickets/simulate-stream`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to simulate stream tweet');
  return res.json();
}

export async function classifyTweetSandbox(data: {
  tweet_text: string;
  author_handle?: string;
  follower_count?: number;
  is_verified?: boolean;
  custom_tone?: string;
}): Promise<ClassifyResponse> {
  const res = await fetch(`${API_BASE}/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to run classification sandbox');
  return res.json();
}

export async function fetchLatestEvaluation(): Promise<EvaluationReport> {
  const res = await fetch(`${API_BASE}/evaluation/latest`);
  if (!res.ok) throw new Error('Failed to fetch evaluation report');
  return res.json();
}

export async function runNewEvaluation(): Promise<EvaluationReport> {
  const res = await fetch(`${API_BASE}/evaluation/run`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to run evaluation benchmark');
  return res.json();
}

export async function fetchKnowledgeBase(params?: {
  intent?: string;
  search?: string;
}): Promise<HistoricalConversation[]> {
  const url = new URL(`${window.location.origin}${API_BASE}/knowledge-base`);
  if (params?.intent && params.intent !== 'ALL') url.searchParams.append('intent', params.intent);
  if (params?.search) url.searchParams.append('search', params.search);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch knowledge base');
  return res.json();
}

export async function createKnowledgeBaseItem(data: {
  brand?: string;
  customer_handle?: string;
  incoming_tweet: string;
  agent_reply: string;
  intent: string;
  category?: string;
}): Promise<HistoricalConversation> {
  const res = await fetch(`${API_BASE}/knowledge-base`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add historical conversation');
  return res.json();
}

export async function deleteKnowledgeBaseItem(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/knowledge-base/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete historical conversation');
}

export async function fetchBrandSettings(): Promise<BrandSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch brand settings');
  return res.json();
}

export async function updateBrandSettings(data: Partial<BrandSettings>): Promise<BrandSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update brand settings');
  return res.json();
}

// -----------------------------------------------------------------------------
// Kaggle TWCS Spotify Ingestion Pipeline API
// -----------------------------------------------------------------------------

export async function fetchIngestionReport(): Promise<IngestionReportData> {
  const res = await fetch(`${API_BASE}/pipeline/report`);
  if (!res.ok) throw new Error('Failed to fetch ingestion report');
  return res.json();
}

export async function fetchCleanedPreview(limit = 20): Promise<CleanedConversation[]> {
  const res = await fetch(`${API_BASE}/pipeline/preview?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch cleaned preview');
  return res.json();
}

export async function runIngestionPipeline(csvFilePath?: string, file?: File): Promise<IngestionReportData> {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/pipeline/run`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to execute ingestion pipeline with uploaded file');
    return res.json();
  } else {
    const formData = new FormData();
    if (csvFilePath) {
      formData.append('csv_file_path', csvFilePath);
    }
    const res = await fetch(`${API_BASE}/pipeline/run`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to execute ingestion pipeline');
    return res.json();
  }
}

// -----------------------------------------------------------------------------
// Intent Discovery & Intent Explorer API
// -----------------------------------------------------------------------------

export async function fetchDiscoveredIntents(): Promise<IntentDiscoveryReport> {
  const res = await fetch(`${API_BASE}/intent-discovery/intents`);
  if (!res.ok) throw new Error('Failed to fetch discovered intents');
  return res.json();
}

export async function runIntentDiscovery(): Promise<IntentDiscoveryReport> {
  const res = await fetch(`${API_BASE}/intent-discovery/run`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to execute intent discovery clustering');
  return res.json();
}

export async function fetchIntentConversations(params?: {
  search?: string;
  suggested_intent?: string;
  true_intent?: string;
  limit?: number;
  offset?: number;
}): Promise<IntentConversationsResponse> {
  const url = new URL(`${window.location.origin}${API_BASE}/intent-discovery/conversations`);
  if (params?.search) url.searchParams.append('search', params.search);
  if (params?.suggested_intent && params.suggested_intent !== 'ALL') {
    url.searchParams.append('suggested_intent', params.suggested_intent);
  }
  if (params?.true_intent && params.true_intent !== 'ALL') {
    url.searchParams.append('true_intent', params.true_intent);
  }
  if (params?.limit) url.searchParams.append('limit', params.limit.toString());
  if (params?.offset !== undefined) url.searchParams.append('offset', params.offset.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch intent conversations');
  return res.json();
}

export function getExportIntentsCsvUrl(): string {
  return `${API_BASE}/intent-discovery/export-csv`;
}

// -----------------------------------------------------------------------------
// Production Intent Classification API
// -----------------------------------------------------------------------------

import type {
  PredictIntentRequest,
  PredictIntentResponse,
  ClassifierEvaluationReport,
  SavedPredictionsResponse
} from '../types';

export async function predictIntent(payload: PredictIntentRequest): Promise<PredictIntentResponse> {
  const res = await fetch(`${API_BASE}/predict-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to predict intent');
  return res.json();
}

export async function fetchClassifierEvaluation(): Promise<ClassifierEvaluationReport> {
  const res = await fetch(`${API_BASE}/classifier/evaluation`);
  if (!res.ok) throw new Error('Failed to fetch classifier evaluation metrics');
  return res.json();
}

export async function retrainClassifier(): Promise<ClassifierEvaluationReport> {
  const res = await fetch(`${API_BASE}/classifier/retrain`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to retrain classifier');
  return res.json();
}

export async function fetchRecentPredictions(
  limit: number = 20,
  offset: number = 0
): Promise<SavedPredictionsResponse> {
  const url = new URL(`${window.location.origin}${API_BASE}/classifier/predictions`);
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('offset', offset.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch recent predictions');
  return res.json();
}

// -----------------------------------------------------------------------------
// Golden Set Annotation API
// -----------------------------------------------------------------------------

import type {
  GoldenSetStatusResponse,
  SaveAnnotationResponse
} from '../types';

export async function fetchGoldenSetItems(): Promise<GoldenSetStatusResponse> {
  const res = await fetch(`${API_BASE}/golden-set/items`);
  if (!res.ok) throw new Error('Failed to fetch golden set items');
  return res.json();
}

export async function saveGoldenSetAnnotation(
  conversationId: string,
  trueIntent: string
): Promise<SaveAnnotationResponse> {
  const res = await fetch(`${API_BASE}/golden-set/annotate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversationId,
      true_intent: trueIntent
    }),
  });
  if (!res.ok) throw new Error('Failed to save golden set annotation');
  return res.json();
}

export async function resampleGoldenSet(): Promise<GoldenSetStatusResponse> {
  const res = await fetch(`${API_BASE}/golden-set/resample`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to resample golden set');
  return res.json();
}

export function getExportGoldenSetCsvUrl(): string {
  return `${API_BASE}/golden-set/export-csv`;
}

// -----------------------------------------------------------------------------
// RAG Spotify Reply Generation API
// -----------------------------------------------------------------------------

import type { RagReplyResponse } from '../types';

export async function generateRagReply(customerTweet: string): Promise<RagReplyResponse> {
  const res = await fetch(`${API_BASE}/generate-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_tweet: customerTweet }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to generate RAG reply');
  }
  return res.json();
}

export async function fetchRagStatus(): Promise<{
  status: string;
  index_type: string;
  total_indexed_conversations: number;
  embedding_dimension: number;
  model: string;
}> {
  const res = await fetch(`${API_BASE}/rag/status`);
  if (!res.ok) throw new Error('Failed to fetch RAG status');
  return res.json();
}

// -----------------------------------------------------------------------------
// Escalation Decision Engine API
// -----------------------------------------------------------------------------

import type { DecideEscalationRequest, DecideEscalationResponse } from '../types';

export async function decideEscalation(data: DecideEscalationRequest): Promise<DecideEscalationResponse> {
  const res = await fetch(`${API_BASE}/decide-escalation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to decide escalation');
  }
  return res.json();
}

// -----------------------------------------------------------------------------
// LLM-as-Judge Evaluation API
// -----------------------------------------------------------------------------

import type {
  LLMJudgeStatusResponse,
  SaveHumanJudgeScoreRequest,
  SaveHumanJudgeScoreResponse,
  JudgeAgreementMetrics
} from '../types';

export async function fetchLLMJudgeSamples(): Promise<LLMJudgeStatusResponse> {
  const res = await fetch(`${API_BASE}/llm-judge/samples`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch LLM Judge samples');
  }
  return res.json();
}

export async function submitHumanJudgeScore(
  payload: SaveHumanJudgeScoreRequest
): Promise<SaveHumanJudgeScoreResponse> {
  const res = await fetch(`${API_BASE}/llm-judge/human-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit human evaluation score');
  }
  return res.json();
}

export async function resampleLLMJudge(): Promise<LLMJudgeStatusResponse> {
  const res = await fetch(`${API_BASE}/llm-judge/resample`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to resample LLM Judge evaluations');
  }
  return res.json();
}

export async function fetchJudgeAgreementMetrics(): Promise<JudgeAgreementMetrics> {
  const res = await fetch(`${API_BASE}/llm-judge/metrics`);
  if (!res.ok) throw new Error('Failed to fetch judge agreement metrics');
  return res.json();
}

export function getExportJudgeCsvUrl(): string {
  return `${API_BASE}/llm-judge/export-csv`;
}

export function getExportJudgeJsonUrl(): string {
  return `${API_BASE}/llm-judge/export-json`;
}


