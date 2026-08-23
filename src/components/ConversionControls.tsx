import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  Loader2, 
  Music, 
  Volume2, 
  Radio, 
  ShieldCheck, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  RotateCcw
} from 'lucide-react';
import { ConversionSettings, ProcessingStage, TerminalLog } from '../types';

interface ConversionControlsProps {
  canConvert: boolean;
  isConverting: boolean;
  progress: number;
  stages: ProcessingStage[];
  logs: TerminalLog[];
  settings: ConversionSettings;
  queueCount?: number;
  engineReady?: boolean;
  engineLoading?: boolean;
  engineError?: string | null;
  onSettingsChange: (settings: ConversionSettings) => void;
  onStartConversion: () => void;
  onCancelConversion: () => void;
}

export const ConversionControls: React.FC<ConversionControlsProps> = ({
  canConvert,
  isConverting,
  progress,
  stages,
  logs,
  settings,
  queueCount = 0,
  engineReady = true,
  engineLoading = false,
  engineError = null,
  onSettingsChange,
  onStartConversion,
  onCancelConversion,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showTerminalLogs, setShowTerminalLogs] = useState(false);

  const activeStage = stages.find((s) => s.status === 'active') || stages[0];

  return (
    <section id="section-step-3-conversion" className="mt-8 max-w-5xl mx-auto px-4">
      {/* If converting, show the Processing Progress Card */}
      {isConverting ? (
        <div 
          id="card-processing-progress"
          className="rounded-3xl glass-panel p-6 sm:p-8 border border-[#00f0ff]/30 shadow-2xl relative overflow-hidden transition-all duration-300"
        >
          {/* Top glowing shimmer sweep */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent animate-pulse" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-[#00f0ff]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Client-Side Voice Synthesis in Progress
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {activeStage?.description || 'Executing WebAssembly FFmpeg pipeline in browser...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono">
              <div className="text-right">
                <div className="text-3xl font-black text-gradient-cyan-purple">
                  {Math.round(progress)}%
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  FFmpeg WASM Active
                </div>
              </div>
            </div>
          </div>

          {/* Animated Glass Progress Bar */}
          <div className="mt-6">
            <div className="h-3.5 w-full rounded-full bg-slate-950/80 p-0.5 border border-white/10 overflow-hidden relative shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] relative transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.6)]"
                style={{ width: `${Math.max(4, progress)}%` }}
              >
                {/* Shimmer light bar */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-fast" />
              </div>
            </div>
          </div>

          {/* Phased Step Indicators */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {stages.map((stage, idx) => {
              const isDone = stage.status === 'completed';
              const isActive = stage.status === 'active';

              return (
                <div
                  key={stage.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isActive
                      ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-white shadow-lg shadow-[#00f0ff]/10'
                      : 'bg-slate-900/40 border-white/5 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-[#00f0ff] animate-spin flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] font-mono flex-shrink-0">
                        {idx + 1}
                      </span>
                    )}
                    <span className="text-xs font-bold truncate">{stage.title}</span>
                  </div>
                  <p className="text-[11px] opacity-80 line-clamp-2 leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Collapsible Terminal Inference Logs */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col">
            <button
              onClick={() => setShowTerminalLogs(!showTerminalLogs)}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-between py-1 focus:outline-none"
            >
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-[#00f0ff]" />
                WebAssembly FFmpeg CLI & DSP Logs ({logs.length} events logged)
              </span>
              {showTerminalLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTerminalLogs && (
              <div className="mt-2.5 p-3 rounded-xl bg-black/80 font-mono text-[11px] text-slate-300 space-y-1 max-h-36 overflow-y-auto border border-white/5">
                {logs.length === 0 ? (
                  <div className="text-slate-500 italic">Listening for WebAssembly events...</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                      <span
                        className={
                          log.type === 'success'
                            ? 'text-emerald-400'
                            : log.type === 'process'
                            ? 'text-cyan-300'
                            : log.type === 'warn'
                            ? 'text-amber-400'
                            : 'text-purple-300'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Action Button & Settings Configuration */
        <div className="flex flex-col items-center space-y-6">
          {/* Main Glowing Call-To-Action Button */}
          <div className="relative group w-full max-w-lg">
            {/* Outer Neon Glow Aura Layer */}
            <div 
              className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] blur-xl opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse ${
                !canConvert ? 'opacity-20 blur-sm pointer-events-none' : ''
              }`}
            />

            <button
              id="btn-convert-voice-main"
              disabled={!canConvert}
              onClick={onStartConversion}
              className={`relative w-full py-4 sm:py-5 px-8 rounded-2xl font-black text-base sm:text-lg tracking-wide flex items-center justify-center gap-3 transition-all duration-300 shadow-2xl ${
                canConvert
                  ? 'bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] text-white hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                  : 'bg-slate-900/80 text-slate-500 border border-white/10 cursor-not-allowed'
              }`}
            >
              <Sparkles className={`w-6 h-6 ${canConvert ? 'text-white animate-spin' : 'text-slate-600'}`} style={{ animationDuration: '6s' }} />
              <span>{queueCount > 1 ? `PROCESS ${queueCount} QUEUED VIDEOS WITH AI` : 'CONVERT VOICE WITH AI'}</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                STEP 3
              </span>
            </button>
          </div>

          {!canConvert && (
            <p className="text-xs text-slate-400 text-center flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
              Please select or upload both a <span className="text-white font-medium">Video</span> and a <span className="text-white font-medium">Voice Sample</span> to unlock conversion.
            </p>
          )}

          {/* Quick Settings Bar Toggle */}
          <div className="w-full max-w-2xl rounded-2xl glass-panel p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#00f0ff]" />
                <span className="text-xs font-bold text-white">Acoustic & Neural Tuning</span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  (Model: Neural v3.2 • BGM: {settings.preserveBackgroundMusic ? 'Active' : 'Off'} • Norm: {(settings.autoNormalizeAudio ?? true) ? 'Active' : 'Off'})
                </span>
              </div>

              <button
                id="btn-toggle-tuning-settings"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-xs text-[#00f0ff] hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg glass-panel-subtle hover:bg-white/10 transition-colors"
              >
                <span>{showAdvancedSettings ? 'Hide Tuning' : 'Custom Tuning'}</span>
                {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Advanced Tuning Sliders Drawer */}
            {showAdvancedSettings && (
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Pitch Adjustment Slider (-5 to +5) */}
                <div className="space-y-1.5 p-3 rounded-xl glass-panel-subtle">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Pitch Adjustment</span>
                    <span className="font-mono text-cyan-300">
                      {settings.pitchShift > 0 ? `+${settings.pitchShift}` : settings.pitchShift} semitones
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="1"
                    value={settings.pitchShift}
                    onChange={(e) => onSettingsChange({ ...settings, pitchShift: parseInt(e.target.value) })}
                    className="w-full accent-[#00f0ff] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>-5 (Deeper Voice)</span>
                    <span>0 (Natural Pitch)</span>
                    <span>+5 (Higher Pitch)</span>
                  </div>
                </div>

                {/* Voice Speed Slider (0.5x to 2.0x) */}
                <div className="space-y-1.5 p-3 rounded-xl glass-panel-subtle">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Voice Speed Cadence</span>
                    <span className="font-mono text-pink-300">{(settings.voiceSpeed || 1.0).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.voiceSpeed || 1.0}
                    onChange={(e) => onSettingsChange({ ...settings, voiceSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-[#ec4899] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.5x (Slow/Dramatic)</span>
                    <span>1.0x (Normal)</span>
                    <span>2.0x (Fast Pace)</span>
                  </div>
                </div>

                {/* Timbre Fidelity Slider */}
                <div className="space-y-1.5 p-3 rounded-xl glass-panel-subtle">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Timbre Cloning Fidelity</span>
                    <span className="font-mono text-purple-300">{settings.timbreFidelity}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={settings.timbreFidelity}
                    onChange={(e) => onSettingsChange({ ...settings, timbreFidelity: parseInt(e.target.value) })}
                    className="w-full accent-[#a855f7] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>50% (Smooth)</span>
                    <span>95% (Recommended)</span>
                    <span>100% (Exact Clone)</span>
                  </div>
                </div>

                {/* Background Score Preservation */}
                <div className="space-y-2 p-3 rounded-xl glass-panel-subtle">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.preserveBackgroundMusic}
                        onChange={(e) => onSettingsChange({ ...settings, preserveBackgroundMusic: e.target.checked })}
                        className="rounded bg-slate-900 border-white/20 text-[#00f0ff] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-slate-200 font-medium">Preserve BGM (Demux)</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">Neural</span>
                  </div>

                  {settings.preserveBackgroundMusic && (
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                        Mix:
                      </span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={settings.backgroundMusicVolume}
                        onChange={(e) => onSettingsChange({ ...settings, backgroundMusicVolume: parseInt(e.target.value) })}
                        className="flex-1 accent-emerald-400 cursor-pointer"
                      />
                      <span className="font-mono text-emerald-300 text-xs w-8">{settings.backgroundMusicVolume}%</span>
                    </div>
                  )}
                </div>

                {/* Auto-Normalize Audio Toggle */}
                <div className="space-y-2 p-3 rounded-xl glass-panel-subtle">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer" htmlFor="toggle-auto-normalize-audio">
                      <input
                        id="toggle-auto-normalize-audio"
                        type="checkbox"
                        checked={settings.autoNormalizeAudio ?? true}
                        onChange={(e) => onSettingsChange({ ...settings, autoNormalizeAudio: e.target.checked })}
                        className="rounded bg-slate-900 border-white/20 text-[#00f0ff] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-slate-200 font-medium flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                        Auto-Normalize Audio
                      </span>
                    </label>
                    <span className="text-[10px] text-cyan-300 font-mono px-1.5 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                      EBU R128 (-14 LUFS)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Applies dynamic gain adjustment & loudness normalization across all speaker segments for consistent, studio-balanced volume levels.
                  </p>
                </div>

                {/* Subtitle Burn-In & Styling */}
                <div className="space-y-2 p-3 rounded-xl glass-panel-subtle sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.burnSubtitles)}
                        onChange={(e) => onSettingsChange({ ...settings, burnSubtitles: e.target.checked })}
                        className="rounded bg-slate-900 border-white/20 text-[#00f0ff] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-slate-200 font-medium flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-[#00f0ff]" />
                        Burn Subtitles into Video (.srt)
                      </span>
                    </label>
                    <span className="text-[10px] text-cyan-300 font-mono">FFmpeg Overlay</span>
                  </div>

                  {settings.burnSubtitles && (
                    <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-white/5">
                      <span className="text-slate-400 text-[11px]">Overlay Preset:</span>
                      <div className="flex items-center gap-1.5">
                        {[
                          { id: 'glass', label: 'Glassmorphic' },
                          { id: 'bold', label: 'Bold Outline' },
                          { id: 'yellow', label: 'Cinema Yellow' },
                          { id: 'minimal', label: 'Minimal' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => onSettingsChange({ ...settings, subtitleStyle: st.id as any })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                              (settings.subtitleStyle || 'glass') === st.id
                                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40'
                                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
