import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Inbox,
  Sparkles,
  BarChart3,
  BookOpen,
  Settings as SettingsIcon,
  Zap,
  RefreshCw,
  Database,
  Compass,
  Target,
  Award,
  Bot,
  Scale
} from 'lucide-react';
import type { InboxStats } from '../../types';

interface NavbarProps {
  stats: InboxStats | null;
  onSimulateTweet: () => void;
  isSimulating: boolean;
  onInboxClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  onSimulateTweet,
  isSimulating,
  onInboxClick,
}) => {
  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    `relative z-50 pointer-events-auto flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all cursor-pointer select-none ${
      isActive
        ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-gray-950 shadow-md shadow-teal-500/20 font-bold'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#0B0F19]/95 backdrop-blur-md pointer-events-auto">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-50 pointer-events-auto">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tagline (Links to /inbox) */}
          <Link
            to="/inbox"
            onClick={() => onInboxClick?.()}
            className="flex items-center space-x-3 cursor-pointer group relative z-50 pointer-events-auto"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-gray-950 font-bold shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform pointer-events-none">
              <Sparkles className="w-5 h-5 text-gray-950 animate-pulse pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full border-2 border-[#0B0F19] animate-ping pointer-events-none" />
            </div>
            <div className="pointer-events-none">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-gray-200 to-teal-200 bg-clip-text text-transparent">
                  SupportPilot
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium hidden sm:block">
                Autonomous AI Support & Triage Platform
              </p>
            </div>
          </Link>

          {/* Navigation Tabs using React Router NavLink */}
          <nav className="flex items-center space-x-1 bg-gray-900/90 p-1.5 rounded-xl border border-gray-800 overflow-x-auto max-w-full lg:max-w-none custom-scrollbar relative z-50 pointer-events-auto">
            <NavLink
              to="/inbox"
              onClick={() => onInboxClick?.()}
              className={getNavClass}
            >
              {({ isActive }) => (
                <>
                  <Inbox className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="pointer-events-none">Inbox</span>
                  {stats && stats.total_tickets > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold pointer-events-none ${
                        isActive ? 'bg-gray-950/20 text-gray-950' : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {stats.total_tickets}
                    </span>
                  )}
                </>
              )}
            </NavLink>

            <NavLink to="/pipeline" className={getNavClass}>
              <Database className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Data Pipeline</span>
            </NavLink>

            <NavLink to="/intents" className={getNavClass}>
              <Compass className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Intent Explorer</span>
            </NavLink>

            <NavLink to="/classifier" className={getNavClass}>
              <Target className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Test Classifier</span>
            </NavLink>

            <NavLink to="/reply-generator" className={getNavClass}>
              <Bot className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Reply Generator</span>
            </NavLink>

            <NavLink to="/golden-set" className={getNavClass}>
              <Award className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Golden Set</span>
            </NavLink>

            <NavLink to="/judge" className={getNavClass}>
              <Scale className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">LLM Judge</span>
            </NavLink>

            <NavLink to="/sandbox" className={getNavClass}>
              <Zap className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Sandbox</span>
            </NavLink>

            <NavLink to="/evaluation" className={getNavClass}>
              <BarChart3 className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Evaluation & Matrix</span>
            </NavLink>

            <NavLink to="/knowledge" className={getNavClass}>
              <BookOpen className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Knowledge Base</span>
            </NavLink>

            <NavLink to="/settings" className={getNavClass}>
              <SettingsIcon className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Settings</span>
            </NavLink>
          </nav>

          {/* Action Simulation Button */}
          <div className="flex items-center space-x-3 relative z-50 pointer-events-auto">
            {stats && (
              <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-xs">
                <span className="text-gray-400">Auto-Resolved:</span>
                <span className="font-bold text-teal-400">{stats.automation_rate_pct}%</span>
              </div>
            )}

            <button
              onClick={onSimulateTweet}
              disabled={isSimulating}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer pointer-events-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-teal-400' : ''}`} />
              <span>{isSimulating ? 'Ingesting Tweet...' : 'Simulate Tweet'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
