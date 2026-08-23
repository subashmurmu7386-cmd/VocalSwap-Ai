import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Activity, 
  Layers, 
  BookOpen, 
  ShieldCheck,
  History
} from 'lucide-react';

interface NavbarProps {
  onOpenHowItWorks: () => void;
  onOpenHistory: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHowItWorks,
  onOpenHistory,
  onReset,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    if (showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusMenu]);

  return (
    <header id="main-navigation" className="sticky top-4 z-40 w-full max-w-7xl mx-auto px-4 sm:px-6">
      <nav 
        id="glass-navbar-container"
        className="relative flex items-center justify-between px-4 sm:px-6 py-3 rounded-2xl glass-panel shadow-2xl transition-all duration-300"
      >
        {/* Brand Logo & Glow Mark */}
        <button 
          id="btn-nav-brand-logo"
          onClick={onReset}
          className="flex items-center gap-3 group text-left focus:outline-none shrink-0"
        >
          <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400/50 transition-all duration-300">
            <svg 
              className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M2 10v4" />
              <path d="M6 6v12" />
              <path d="M10 3v18" />
              <path d="M14 7v10" />
              <path d="M18 5v14" />
              <path d="M22 10v4" />
            </svg>
            <div className="absolute inset-0 rounded-xl bg-cyan-400/10 blur-sm -z-10 group-hover:bg-cyan-400/20 transition-all"></div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent font-bold tracking-wider text-lg sm:text-xl font-mono whitespace-nowrap">
                VOCALSWAP
              </span>
              <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 whitespace-nowrap">
                v3.2
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide hidden sm:inline-block whitespace-nowrap">
              Neural Video Voice Replacement
            </span>
          </div>
        </button>

        {/* Center Navigation Links */}
        <div id="nav-links-center" className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <button 
            id="nav-link-studio"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:text-[#00f0ff] hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-[#00f0ff]" />
            <span>Studio</span>
          </button>

          <button 
            id="nav-link-history"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <History className="w-4 h-4 text-[#00f0ff]" />
            <span>History</span>
          </button>

          <button 
            id="nav-link-how-it-works"
            onClick={onOpenHowItWorks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 text-[#ec4899]" />
            <span>How it Works</span>
          </button>
        </div>

        {/* Right Status Badge & Actions */}
        <div id="nav-status-right" className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cloud History Icon on Mobile */}
          <button
            id="btn-mobile-history"
            onClick={onOpenHistory}
            className="p-2 rounded-xl glass-panel-subtle hover:bg-white/10 md:hidden text-cyan-400 focus:outline-none"
            title="Open History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* System Status Pill */}
          <div className="relative" ref={statusMenuRef}>
            <button 
              id="btn-status-indicator"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold whitespace-nowrap transition-all shadow-sm hover:bg-emerald-500/20 focus:outline-none cursor-pointer shrink-0"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline whitespace-nowrap">Engine:</span>
              <span className="font-semibold text-white whitespace-nowrap">Online</span>
              <span className="text-[11px] text-emerald-300/80 border-l border-emerald-500/20 pl-2 hidden lg:inline whitespace-nowrap">
                WASM + AI Active
              </span>
            </button>

            {/* Status Dropdown Popover */}
            {showStatusMenu && (
              <div 
                id="popover-status-details"
                className="absolute right-0 top-full mt-2 w-72 p-4 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Pipeline Architecture
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono whitespace-nowrap">
                    Ready
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Media Demuxer:</span>
                    <span className="font-mono text-cyan-300">FFmpeg WebAssembly</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Audio Pipeline:</span>
                    <span className="font-mono text-emerald-400">48kHz / 32-bit Float</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">AI Synthesis:</span>
                    <span className="font-mono text-purple-300">Zero-Shot Neural Core</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    Zero Data Retention
                  </span>
                  <button 
                    onClick={() => setShowStatusMenu(false)}
                    className="text-cyan-400 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
