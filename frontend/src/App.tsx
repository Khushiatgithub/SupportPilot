import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { TicketInbox } from './components/inbox/TicketInbox';
import { TicketDetailDrawer } from './components/inbox/TicketDetailDrawer';
import { TweetSandbox } from './components/sandbox/TweetSandbox';
import { EvaluationDashboard } from './components/evaluation/EvaluationDashboard';
import { KnowledgeBaseView } from './components/knowledge/KnowledgeBaseView';
import { BrandSettingsView } from './components/settings/BrandSettingsView';
import { IngestionPipelineView } from './components/pipeline/IngestionPipelineView';
import { IntentExplorerView } from './components/intent_explorer/IntentExplorerView';
import { TestClassifierView } from './components/classifier/TestClassifierView';
import { GoldenSetAnnotationView } from './components/golden_set/GoldenSetAnnotationView';
import { ReplyGeneratorView } from './components/reply_generator/ReplyGeneratorView';
import { LLMJudgeEvaluationView } from './components/judge/LLMJudgeEvaluationView';
import type { Ticket, InboxStats, EvaluationReport } from './types';
import {
  fetchInboxConversations,
  simulateIncomingTweet,
  fetchLatestEvaluation,
  runNewEvaluation,
  approveTicketReply,
  regenerateTicketReply,
  updateTicket
} from './lib/api';

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // State for tickets and stats
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [intentFilter, setIntentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTicketsCount, setTotalTicketsCount] = useState<number>(0);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // State for evaluation
  const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // Load initial data directly from 1,169 cleaned Spotify conversations
  const loadTicketsAndStats = async () => {
    setIsLoadingTickets(true);
    try {
      const inboxData = await fetchInboxConversations({
        page,
        page_size: 20,
        status: statusFilter,
        intent: intentFilter,
        search: searchQuery
      });
      setTickets(inboxData.conversations);
      setStats(inboxData.stats);
      setTotalPages(inboxData.total_pages);
      setTotalTicketsCount(inboxData.total);
    } catch (err) {
      console.error('Error fetching tickets/stats:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const loadEvaluation = async () => {
    try {
      const report = await fetchLatestEvaluation();
      setEvalReport(report);
    } catch (err) {
      console.error('Error fetching evaluation:', err);
    }
  };

  useEffect(() => {
    loadTicketsAndStats();
  }, [page, statusFilter, intentFilter, searchQuery]);

  useEffect(() => {
    loadEvaluation();
  }, []);

  // Simulate incoming stream tweet
  const handleSimulateTweet = async () => {
    setIsSimulating(true);
    try {
      const newTicket = await simulateIncomingTweet();
      await loadTicketsAndStats();
      setSelectedTicket(newTicket);
      if (location.pathname !== '/inbox') {
        navigate('/inbox');
      }
    } catch (err) {
      console.error('Failed to simulate tweet:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Re-run evaluation benchmark
  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const updatedReport = await runNewEvaluation();
      setEvalReport(updatedReport);
    } catch (err) {
      console.error('Failed to run benchmark:', err);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  // Approve ticket reply
  const handleApproveReply = async (ticketId: number, finalReply: string, notes: string) => {
    try {
      await approveTicketReply(ticketId, { final_reply: finalReply, agent_notes: notes });
      setSelectedTicket(null);
      await loadTicketsAndStats();
    } catch (err) {
      console.error('Failed to approve reply:', err);
    }
  };

  // Regenerate reply
  const handleRegenerateReply = async (ticketId: number, tone: string) => {
    try {
      const updated = await regenerateTicketReply(ticketId, tone);
      setSelectedTicket(updated);
      await loadTicketsAndStats();
    } catch (err) {
      console.error('Failed to regenerate reply:', err);
    }
  };

  // Update ticket status
  const handleUpdateStatus = async (ticketId: number, status: string) => {
    try {
      await updateTicket(ticketId, { status });
      setSelectedTicket(null);
      await loadTicketsAndStats();
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  // Reset inbox state and refresh feed when clicking Inbox nav tab
  const handleInboxClick = () => {
    setStatusFilter('ALL');
    setIntentFilter('ALL');
    setSearchQuery('');
    setPage(1);
    setSelectedTicket(null);
    loadTicketsAndStats();
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-gray-100 flex flex-col selection:bg-teal-500 selection:text-gray-950 font-sans">
      
      {/* Top Navbar */}
      <Navbar
        stats={stats}
        onSimulateTweet={handleSimulateTweet}
        isSimulating={isSimulating}
        onInboxClick={handleInboxClick}
      />

      {/* Main Content Area with React Router Routes */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-0">
        <Routes>
          {/* Default Landing Route: redirect to /inbox */}
          <Route path="/" element={<Navigate to="/inbox" replace />} />

          {/* /inbox: Customer Support Conversations Feed */}
          <Route
            path="/inbox"
            element={
              <TicketInbox
                tickets={tickets}
                stats={stats}
                onSelectTicket={(t) => setSelectedTicket(t)}
                onRefresh={loadTicketsAndStats}
                isLoading={isLoadingTickets}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                intentFilter={intentFilter}
                setIntentFilter={setIntentFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                totalTicketsCount={totalTicketsCount}
                pageSize={20}
              />
            }
          />

          {/* /pipeline: Kaggle TWCS Spotify Ingestion Pipeline */}
          <Route path="/pipeline" element={<IngestionPipelineView />} />

          {/* /intents: Unsupervised Semantic Intent Explorer */}
          <Route path="/intents" element={<IntentExplorerView />} />

          {/* /classifier: Production Intent Classifier Playground & Benchmarks */}
          <Route path="/classifier" element={<TestClassifierView />} />

          {/* /reply-generator: Grounded Spotify Support RAG Reply Generator */}
          <Route path="/reply-generator" element={<ReplyGeneratorView />} />
          <Route path="/generator" element={<Navigate to="/reply-generator" replace />} />

          {/* /golden-set: Golden Set Annotation Studio */}
          <Route path="/golden-set" element={<GoldenSetAnnotationView />} />

          {/* /judge: LLM-as-Judge Reply Evaluation & Agreement Studio */}
          <Route path="/judge" element={<LLMJudgeEvaluationView />} />
          <Route path="/llm-judge" element={<Navigate to="/judge" replace />} />

          {/* /sandbox: Interactive Tweet Classifier Sandbox */}
          <Route path="/sandbox" element={<TweetSandbox />} />

          {/* /evaluation: Model Evaluation & Confusion Matrix */}
          <Route
            path="/evaluation"
            element={
              <EvaluationDashboard
                report={evalReport}
                onRunBenchmark={handleRunBenchmark}
                isRunningBenchmark={isRunningBenchmark}
              />
            }
          />

          {/* /knowledge: Knowledge Base */}
          <Route path="/knowledge" element={<KnowledgeBaseView />} />

          {/* /settings: Brand Settings */}
          <Route path="/settings" element={<BrandSettingsView />} />

          {/* Fallback wildcard: redirect to /inbox */}
          <Route path="*" element={<Navigate to="/inbox" replace />} />
        </Routes>
      </main>

      {/* Slide-out Ticket Drawer */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onApprove={handleApproveReply}
        onRegenerateReply={handleRegenerateReply}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800/60 py-4 mt-12 bg-gray-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Hiver AI Support Agent. Built with FastAPI, PostgreSQL/SQLite, scikit-learn & React Router.</p>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Inference Engine Active</span>
            </span>
            <span>REST API: /api</span>
            <span>Docs: /docs</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
