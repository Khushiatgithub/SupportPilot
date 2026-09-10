import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Inbox,
  Sparkles,
  BarChart3,
  BookOpen,
  Settings as SettingsIcon,
  Zap,
  Database,
  Compass,
  Target,
  Scale
} from 'lucide-react';
import type { InboxStats } from '../../types';

interface NavbarProps {
  stats: InboxStats | null;
  onSimulateTweet: () => void;
  isSimulating: boolean;
  onInboxClick?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  onClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  onSimulateTweet,
  isSimulating,
  onInboxClick,
}) => {
  const location = useLocation();

  const navItems: NavItem[] = [
    { to: '/inbox', label: 'Inbox', icon: Inbox, badge: stats?.total_tickets, onClick: onInboxClick },
    { to: '/reply-generator', label: 'RAG Reply', icon: Sparkles },
    { to: '/intent-explorer', label: 'Intents', icon: Compass },
    { to: '/golden-set', label: 'Golden Set', icon: Target },
    { to: '/evaluation', label: 'Benchmarks', icon: BarChart3 },
    { to: '/judge', label: 'LLM Judge', icon: Scale },
    { to: '/pipeline', label: 'Pipeline', icon: Database },
    { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#06090F]/85 backdrop-blur-2xl pointer-events-auto">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Tagline (Linear-style) */}
          <Link
            to="/inbox"
            onClick={() => onInboxClick?.()}
            className="flex items-center space-x-3 cursor-pointer group flex-shrink-0 select-none"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-gray-950 font-bold shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4 text-gray-950" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#06090F] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-[15px] tracking-tight bg-gradient-to-r from-white via-gray-100 to-teal-200 bg-clip-text text-transparent">
                  SupportPilot
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium hidden md:block">
                Spotify AI Support & Triage
              </p>
            </div>
          </Link>

          {/* Navigation Pill Container */}
          <nav className="flex items-center space-x-1 bg-gray-950/80 p-1 rounded-xl border border-white/[0.07] overflow-x-auto max-w-full custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || (item.to === '/judge' && location.pathname === '/llm-judge');

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={item.onClick}
                  className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150 cursor-pointer select-none ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-500/90 to-emerald-500/90 shadow-sm shadow-teal-500/25"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center space-x-1.5 ${isActive ? 'text-gray-950 font-bold' : ''}`}>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-gray-950 stroke-[2.5]' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-gray-950/20 text-gray-950'
                          : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      }`}>
                        {typeof item.badge === 'number' ? item.badge.toLocaleString() : item.badge}
                      </span>
                    )}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action & Status Bar */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Live System Status */}
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Engine Active</span>
            </div>

            {/* Simulate Stream Inbound Tweet Button */}
            <button
              onClick={onSimulateTweet}
              disabled={isSimulating}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-gray-950 font-bold text-xs shadow-md shadow-teal-500/20 hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Simulate real-time tweet stream arrival"
            >
              <Zap className={`w-3.5 h-3.5 text-gray-950 ${isSimulating ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isSimulating ? 'Processing...' : 'Simulate Tweet'}</span>
              <span className="sm:hidden">Simulate</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
