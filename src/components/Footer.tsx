import React from 'react';
import { ShieldCheck, Activity, Volume2, History, BookOpen, Layers, Sparkles } from 'lucide-react';

interface FooterProps {
  onOpenHowItWorks?: () => void;
  onOpenHistory?: () => void;
  onReset?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenHowItWorks,
  onOpenHistory,
  onReset,
}) => {
  return (
    <footer id="app-footer" className="mt-16 border-t border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand & Logo Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                <svg 
                  className="w-6 h-6 text-cyan-400" 
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
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent font-bold tracking-wider text-xl font-mono">
                    VOCALSWAP
                  </span>
                  <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300">
                    v3.2
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium tracking-wide">
                  Neural Video Voice Replacement
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Next-generation AI video vocal swapper. Seamlessly replace audio tracks, clone voice samples, and generate studio-grade 48kHz audio directly in browser.
            </p>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero Data Retention
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-cyan-400">
                <Activity className="w-3.5 h-3.5" />
                WASM Pipeline
              </span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
              Navigation & Modules
            </h4>
            <ul className="space-y-2 text-xs">
              {onReset && (
                <li>
                  <button
                    onClick={onReset}
                    className="flex items-center gap-2 text-slate-400 hover:text-[#00f0ff] transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>Studio Conversion Workspace</span>
                  </button>
                </li>
              )}
              {onOpenHistory && (
                <li>
                  <button
                    onClick={onOpenHistory}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>Cloud Conversion Vault</span>
                  </button>
                </li>
              )}
              {onOpenHowItWorks && (
                <li>
                  <button
                    onClick={onOpenHowItWorks}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#ec4899]" />
                    <span>Architecture & How it Works</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* System Specs Column */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
              Technical Core
            </h4>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Audio Master:</span>
                <span className="text-cyan-300">48kHz / 32-bit</span>
              </div>
              <div className="flex justify-between">
                <span>Video Codec:</span>
                <span className="text-purple-300">H.264 / AAC / MP4</span>
              </div>
              <div className="flex justify-between">
                <span>Execution:</span>
                <span className="text-emerald-400">WebAssembly + Cloud AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} VocalSwap AI. All rights reserved.</p>
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Powered by Neural Audio Synthesis</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
