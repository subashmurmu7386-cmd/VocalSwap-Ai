import React from 'react';
import { Zap, Shield, Music, PlayCircle, UploadCloud } from 'lucide-react';

export const Hero: React.FC = () => {
  const scrollToUpload = () => {
    const el = document.getElementById('dual-grid-workflow-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero-section" className="relative pt-8 sm:pt-12 pb-4 sm:pb-8 text-center px-4 max-w-5xl mx-auto">
      {/* Ambient Top Glow Tag */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-[#00f0ff]/30 text-xs sm:text-sm font-medium text-white mb-5 shadow-lg shadow-[#00f0ff]/10">
        <span className="flex h-2 w-2 rounded-full bg-[#00f0ff] animate-pulse" />
        <span className="text-slate-300">Neural Voice Synthesis & Lip Sync</span>
        <span className="text-[#00f0ff] font-semibold border-l border-white/10 pl-2">VocalSwap AI</span>
      </div>

      {/* Main Hero Headline with Glowing Gradient */}
      <h1 
        id="hero-main-title" 
        className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15] max-w-4xl mx-auto"
      >
        Swap Any Voice in Any Video with <span className="text-gradient-cyan-purple drop-shadow-sm">AI</span>
      </h1>

      {/* Short Tagline */}
      <p 
        id="hero-tagline" 
        className="mt-4 text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed"
      >
        Upload your video and custom voice sample to synthesize personalized vocal timbres with studio precision.
      </p>

      {/* Primary Singular CTA Button */}
      <div className="mt-6 flex items-center justify-center">
        <button
          id="btn-hero-start-swap"
          onClick={scrollToUpload}
          className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] text-white font-bold text-base transition-all duration-300 shadow-xl shadow-[#00f0ff]/20 hover:shadow-[#00f0ff]/40 hover:scale-[1.03] active:scale-[0.98]"
        >
          <UploadCloud className="w-5 h-5 text-white animate-bounce" />
          <span>Upload Video & Voice</span>
        </button>
      </div>

      {/* Trust & Capability Metrics */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto text-left">
        <div className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">48kHz Studio</div>
            <div className="text-[10px] text-slate-400">Mastered Acoustics</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#a855f7]/10 text-[#a855f7]">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">BGM Isolation</div>
            <div className="text-[10px] text-slate-400">Preserves Soundtracks</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#ec4899]/10 text-[#ec4899]">
            <PlayCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Zero Drift</div>
            <div className="text-[10px] text-slate-400">Lip-Sync Coherence</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl glass-panel-subtle flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Private & Secure</div>
            <div className="text-[10px] text-slate-400">Encrypted Processing</div>
          </div>
        </div>
      </div>
    </section>
  );
};
