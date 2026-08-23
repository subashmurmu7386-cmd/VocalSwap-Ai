import React, { useState } from 'react';
import { 
  Sparkles, 
  Languages, 
  Smile, 
  Clock, 
  Sliders, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Volume2
} from 'lucide-react';
import { GeminiAudioAnalysis } from '../types';

interface GeminiAnalysisCardProps {
  analysis: GeminiAudioAnalysis | null;
  isAnalyzing?: boolean;
  onSeekToTimestamp?: (seconds: number) => void;
  onOpenTranscriptEditor?: () => void;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'error') => void;
}

export const GeminiAnalysisCard: React.FC<GeminiAnalysisCardProps> = ({
  analysis,
  isAnalyzing = false,
  onSeekToTimestamp,
  onOpenTranscriptEditor,
  onShowToast,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  if (!analysis && !isAnalyzing) {
    return null;
  }

  const handleCopyTranscript = () => {
    if (!analysis?.transcript) return;
    navigator.clipboard.writeText(analysis.transcript);
    setHasCopied(true);
    if (onShowToast) {
      onShowToast('Transcript Copied!', 'Exact dialogue copied to clipboard.', 'success');
    }
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div 
      id="gemini-audio-analysis-card"
      className="mt-6 rounded-2xl glass-panel p-5 border border-[#00f0ff]/30 shadow-xl relative overflow-hidden transition-all duration-300"
    >
      {/* Top subtle glow line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00f0ff]/20 to-[#a855f7]/20 border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff] shadow-md shadow-[#00f0ff]/20">
            <Sparkles className="w-4 h-4 text-[#00f0ff] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                Gemini Neural Script & Timing Intelligence
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff] font-semibold">
                {analysis?.modelUsed || 'gemini-3.6-flash'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Low-latency phonetic extraction & word-level lip-sync timestamp synchronization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {analysis?.transcript && (
            <>
              <button
                onClick={() => onOpenTranscriptEditor?.()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-xs text-[#00f0ff] hover:bg-[#00f0ff]/25 font-medium transition-colors"
                title="Edit script dialogue and download subtitles"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Edit Script & SRT</span>
              </button>

              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg glass-panel-subtle hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors"
                title="Copy transcript text"
              >
                {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{hasCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isAnalyzing && !analysis && (
        <div className="py-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
            <span>Analyzing acoustic frequencies with Gemini 2.5 Flash...</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Transcribing dialogue and computing precise phoneme-to-word timing markers
          </p>
        </div>
      )}

      {/* Main Analysis Body */}
      {analysis && isExpanded && (
        <div className="mt-4 space-y-4 animate-in fade-in duration-300">
          {/* Metadata badges row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Detected Language */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2.5">
              <Languages className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-medium">Language</div>
                <div className="text-xs font-bold text-slate-200 truncate">
                  {analysis.language}
                </div>
              </div>
            </div>

            {/* Vocal Tone / Emotion */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2.5">
              <Smile className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-medium">Vocal Tone & Emotion</div>
                <div className="text-xs font-bold text-slate-200 truncate">
                  {analysis.tone}
                </div>
              </div>
            </div>

            {/* Timing Guidance */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-medium">Synthesis Pacing</div>
                <div className="text-xs font-bold text-emerald-300 truncate">
                  {analysis.pacingRecommendation || '1.0x Match'}
                </div>
              </div>
            </div>
          </div>

          {/* Verbatim Transcript box */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#00f0ff]" />
                Verbatim Audio Transcript
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {analysis.wordTimestamps?.length || 0} words indexed
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-normal italic">
              "{analysis.transcript}"
            </p>
          </div>

          {/* Interactive Word Timestamps Alignment Stream */}
          {analysis.wordTimestamps && analysis.wordTimestamps.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#a855f7]" />
                  Word-Level Synchronization Markers (Click to Seek)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Precision: ±10ms
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-black/40 border border-white/5">
                {analysis.wordTimestamps.map((item, idx) => (
                  <button
                    key={`${item.word}-${idx}`}
                    onClick={() => onSeekToTimestamp?.(item.start)}
                    className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-[#00f0ff]/20 border border-white/5 hover:border-[#00f0ff]/40 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer"
                    title={`Seek to ${item.start.toFixed(2)}s - ${item.end.toFixed(2)}s`}
                  >
                    <span>{item.word}</span>
                    <span className="font-mono text-[9px] text-cyan-400/80 group-hover:text-cyan-300">
                      {item.start.toFixed(1)}s
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
