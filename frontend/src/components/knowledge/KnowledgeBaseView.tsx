import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import type { HistoricalConversation } from '../../types';
import { fetchKnowledgeBase, createKnowledgeBaseItem, deleteKnowledgeBaseItem } from '../../lib/api';

export const KnowledgeBaseView: React.FC = () => {
  const [conversations, setConversations] = useState<HistoricalConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntent, setSelectedIntent] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [newBrand, setNewBrand] = useState('Hiver');
  const [newHandle] = useState('@customer');
  const [newTweet, setNewTweet] = useState('');
  const [newReply, setNewReply] = useState('');
  const [newIntent, setNewIntent] = useState('BILLING_REFUND');
  const [newCategory] = useState('Support');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchKnowledgeBase({
        intent: selectedIntent,
        search: searchQuery
      });
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedIntent, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTweet || !newReply) return;

    setIsSubmitting(true);
    try {
      await createKnowledgeBaseItem({
        brand: newBrand,
        customer_handle: newHandle,
        incoming_tweet: newTweet,
        agent_reply: newReply,
        intent: newIntent,
        category: newCategory
      });
      setIsModalOpen(false);
      setNewTweet('');
      setNewReply('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this historical conversation precedent?')) {
      await deleteKnowledgeBaseItem(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Historical Conversations & RAG Knowledge Base</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Grounding repository of verified past Twitter support threads used for context retrieval and brand tone alignment.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-gray-950" />
          <span>Add Historical Precedent</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl glass-panel border border-gray-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tweets or agent replies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <select
          value={selectedIntent}
          onChange={(e) => setSelectedIntent(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-300 focus:outline-none focus:border-teal-500 cursor-pointer"
        >
          <option value="ALL">All Intents</option>
          <option value="BILLING_REFUND">Billing & Refunds</option>
          <option value="TECHNICAL_ISSUE">Technical Issues</option>
          <option value="ACCOUNT_ACCESS">Account Access</option>
          <option value="ORDER_SHIPPING">Order & Delivery</option>
          <option value="FEATURE_REQUEST">Feature Requests</option>
          <option value="CANCELLATION_CHURN">Cancellation & Churn</option>
          <option value="ESCALATION_COMPLAINT">Escalations & Complaints</option>
          <option value="GENERAL_INQUIRY">General Inquiries</option>
        </select>
      </div>

      {/* List of Historical Conversations */}
      <div className="space-y-3">
        {conversations.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass-panel border border-gray-800">
            <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-300">No historical conversations found</p>
          </div>
        ) : (
          conversations.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl glass-panel border border-gray-800 space-y-3">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-bold">
                    {item.brand}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Customer: {item.customer_handle}</span>
                  <span className="text-xs text-gray-500">• Intent: {item.intent.replace(/_/g, ' ')}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-teal-400 font-semibold">
                    Quality: {Math.round(item.quality_score * 100)}%
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-gray-500 hover:text-rose-400 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Thread comparison */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-950/80 border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 font-semibold block mb-0.5">INCOMING CUSTOMER TWEET</span>
                  <p className="text-gray-200 font-normal leading-relaxed">"{item.incoming_tweet}"</p>
                </div>

                <div className="p-2.5 rounded-xl bg-teal-950/20 border border-teal-900/40 text-teal-200">
                  <span className="text-[10px] text-teal-400 font-semibold block mb-0.5">VERIFIED AGENT RESOLUTION</span>
                  <p className="font-normal leading-relaxed">{item.agent_reply}</p>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Add Precedent Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] overflow-hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Historical Support Precedent</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-700 text-xs text-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1">Intent Category</label>
                  <select
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-gray-950 border border-gray-700 text-xs text-gray-200"
                  >
                    <option value="BILLING_REFUND">Billing & Refunds</option>
                    <option value="TECHNICAL_ISSUE">Technical Issues</option>
                    <option value="ACCOUNT_ACCESS">Account Access</option>
                    <option value="ORDER_SHIPPING">Order & Delivery</option>
                    <option value="FEATURE_REQUEST">Feature Requests</option>
                    <option value="CANCELLATION_CHURN">Cancellation & Churn</option>
                    <option value="ESCALATION_COMPLAINT">Escalations & Complaints</option>
                    <option value="GENERAL_INQUIRY">General Inquiries</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1">Customer Tweet Text</label>
                <textarea
                  rows={2}
                  value={newTweet}
                  onChange={(e) => setNewTweet(e.target.value)}
                  placeholder="e.g. How do I update credit card on file?"
                  className="w-full p-2.5 rounded-lg bg-gray-950 border border-gray-700 text-xs text-gray-200 resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1">Agent Verified Reply</label>
                <textarea
                  rows={3}
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="e.g. Hi! You can update payment cards in Settings > Billing..."
                  className="w-full p-2.5 rounded-lg bg-gray-950 border border-gray-700 text-xs text-gray-200 resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-teal-500 text-gray-950 text-xs font-bold shadow-md shadow-teal-500/20"
                >
                  {isSubmitting ? 'Indexing...' : 'Save & Index for RAG'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
