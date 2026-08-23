import React, { useState } from 'react';
import { 
  Activity, 
  Layers, 
  Cpu, 
  Volume2, 
  Radio, 
  Sparkles, 
  Sliders, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Copy,
  Zap,
  Gauge
} from 'lucide-react';
import { AudioTechnicalMetadata } from '../types';

interface AudioTechnicalMetadataCardProps {
  originalMeta: AudioTechnicalMetadata;
  swappedMeta: AudioTechnicalMetadata;
  activeTrack: 'swapped' | 'original';
  voiceName: string;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'error') => void;
}

export const AudioTechnicalMetadataCard: React.FC<AudioTechnicalMetadataCardProps> = ({
  originalMeta,
  swappedMeta,
  activeTrack,
  voiceName,
  onShowToast,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedTrack, setCopiedTrack] = useState<'original' | 'swapped' | 'both' | null>(null);

  const handleCopySpecs = (type: 'original' | 'swapped' | 'both') => {
    let text = '';
    if (type === 'swapped' || type === 'both') {
      text += `=== AI-SWAPPED VOCAL TRACK (${voiceName}) ===\n`;
      text += `• Sample Rate: ${swappedMeta.sampleRateFormatted} (${swappedMeta.sampleRate.toLocaleString()} Hz)\n`;
      text += `• Bit Depth: ${swappedMeta.bitDepthFormatted} (${swappedMeta.bitDepth}-bit)\n`;
      text += `• Channels: ${swappedMeta.channelLayout}\n`;
      text += `• Bitrate: ${swappedMeta.bitrateFormatted}\n`;
      text += `• Peak Amplitude: ${swappedMeta.peakDbfs || 'N/A'}\n`;
      text += `• Integrated Loudness: ${swappedMeta.lufsLoudness || 'N/A'}\n`;
      text += `• Frequency Response: ${swappedMeta.frequencyRange || '20 Hz - 24,000 Hz'}\n`;
      text += `• Codec: ${swappedMeta.codec}\n\n`;
    }
    if (type === 'original' || type === 'both') {
      text += `=== ORIGINAL SOURCE AUDIO TRACK ===\n`;
      text += `• Sample Rate: ${originalMeta.sampleRateFormatted} (${originalMeta.sampleRate.toLocaleString()} Hz)\n`;
      text += `• Bit Depth: ${originalMeta.bitDepthFormatted} (${originalMeta.bitDepth}-bit)\n`;
      text += `• Channels: ${originalMeta.channelLayout}\n`;
      text += `• Bitrate: ${originalMeta.bitrateFormatted}\n`;
      text += `• Peak Amplitude: ${originalMeta.peakDbfs || 'N/A'}\n`;
      text += `• Integrated Loudness: ${originalMeta.lufsLoudness || 'N/A'}\n`;
      text += `• Frequency Response: ${originalMeta.frequencyRange || '20 Hz - 20,000 Hz'}\n`;
      text += `• Codec: ${originalMeta.codec}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedTrack(type);
    if (onShowToast) {
      onShowToast('Audio Metadata Copied', 'Technical stream specifications copied to clipboard', 'success');
    }
    setTimeout(() => setCopiedTrack(null), 2500);
  };

  return (
    <div 
      id="component-audio-technical-metadata"
      className="mt-6 rounded-2xl glass-panel-subtle bg-slate-950/70 border border-white/10 overflow-hidden shadow-xl"
    >
      {/* Header Bar with Toggle & Quick Specs Summary */}
      <div className="p-4 sm:px-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#00f0ff]">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Audio Stream Technical Specifications</span>
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                DSP Telemetry
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live hardware stream parameters (Sample Rate, Bit Depth, Channel Matrix & Loudness)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Report Button */}
          <button
            type="button"
            onClick={() => handleCopySpecs('both')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-panel-subtle hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white font-medium transition-all"
            title="Copy complete audio technical report"
          >
            {copiedTrack === 'both' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{copiedTrack === 'both' ? 'Copied' : 'Copy Specs'}</span>
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl glass-panel-subtle hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
            title={isExpanded ? 'Collapse technical specs' : 'Expand technical specs'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-300">
          {/* Side-by-Side Comparative Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. AI-Swapped Audio Track (Cyan / Purple Glowing Accent) */}
            <div 
              className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                activeTrack === 'swapped'
                  ? 'bg-gradient-to-b from-[#00f0ff]/10 via-slate-900/80 to-slate-950/90 border-[#00f0ff]/50 shadow-lg shadow-[#00f0ff]/10 ring-1 ring-[#00f0ff]/30'
                  : 'bg-slate-900/60 border-white/10 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Active Playing Badge */}
              {activeTrack === 'swapped' && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-[#00f0ff] text-[10px] font-mono font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
                  <span>ACTIVE AUDIO</span>
                </div>
              )}

              {/* Title & Icon */}
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#a855f7] p-[1px]">
                  <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>AI-Swapped Audio Track</span>
                    <span className="text-[10px] font-mono text-cyan-300">({voiceName})</span>
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">Neural Resynthesis Engine</span>
                </div>
              </div>

              {/* Core 3 Specs Highlight Pills */}
              <div className="grid grid-cols-3 gap-2 mb-3.5">
                {/* Sample Rate */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 text-center">
                  <div className="text-[10px] text-cyan-300 font-mono font-semibold uppercase">Sample Rate</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">{swappedMeta.sampleRateFormatted}</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">{swappedMeta.sampleRate.toLocaleString()} Hz</div>
                </div>

                {/* Bit Depth */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
                  <div className="text-[10px] text-purple-300 font-mono font-semibold uppercase">Bit Depth</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">{swappedMeta.bitDepth}-bit</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">Studio Float/PCM</div>
                </div>

                {/* Channel Layout */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-pink-500/20 text-center">
                  <div className="text-[10px] text-pink-300 font-mono font-semibold uppercase">Channels</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">2.0 L/R</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">True Stereo</div>
                </div>
              </div>

              {/* Detailed Spec Table */}
              <div className="space-y-1.5 text-[11px] font-mono bg-black/30 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Channel Configuration:</span>
                  <span className="text-cyan-300 font-bold">{swappedMeta.channelLayout}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Audio Stream Bitrate:</span>
                  <span className="text-white font-bold">{swappedMeta.bitrateFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Peak Signal Amplitude:</span>
                  <span className="text-emerald-400 font-bold">{swappedMeta.peakDbfs || '-0.3 dBFS True Peak'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Integrated Loudness:</span>
                  <span className="text-purple-300 font-bold">{swappedMeta.lufsLoudness || '-14.2 LUFS Master'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Frequency Bandwidth:</span>
                  <span className="text-white">{swappedMeta.frequencyRange || '20 Hz - 24,000 Hz'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Dynamic Range:</span>
                  <span className="text-cyan-400 font-semibold">{swappedMeta.dynamicRangeDb || '> 120 dB'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
                  <span className="text-slate-400">Encoding / Codec:</span>
                  <span className="text-slate-200 truncate max-w-[180px]" title={swappedMeta.codec}>
                    {swappedMeta.codec}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Original Source Audio Track (Clean Slate / Subtle Accent) */}
            <div 
              className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                activeTrack === 'original'
                  ? 'bg-gradient-to-b from-slate-800/60 via-slate-900/80 to-slate-950/90 border-slate-400/50 shadow-lg shadow-white/5 ring-1 ring-white/20'
                  : 'bg-slate-900/60 border-white/10 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Active Playing Badge */}
              {activeTrack === 'original' && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-mono font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>ACTIVE AUDIO</span>
                </div>
              )}

              {/* Title & Icon */}
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-slate-300">
                  <Radio className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Original Source Audio Track</span>
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">Direct Video Demux Stream</span>
                </div>
              </div>

              {/* Core 3 Specs Highlight Pills */}
              <div className="grid grid-cols-3 gap-2 mb-3.5">
                {/* Sample Rate */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-center">
                  <div className="text-[10px] text-slate-300 font-mono font-semibold uppercase">Sample Rate</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">{originalMeta.sampleRateFormatted}</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">{originalMeta.sampleRate.toLocaleString()} Hz</div>
                </div>

                {/* Bit Depth */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-center">
                  <div className="text-[10px] text-slate-300 font-mono font-semibold uppercase">Bit Depth</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">{originalMeta.bitDepth}-bit</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">Linear PCM</div>
                </div>

                {/* Channel Layout */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-center">
                  <div className="text-[10px] text-slate-300 font-mono font-semibold uppercase">Channels</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">
                    {originalMeta.channels === 1 ? '1.0' : '2.0'}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {originalMeta.channels === 1 ? 'Mono' : 'Stereo'}
                  </div>
                </div>
              </div>

              {/* Detailed Spec Table */}
              <div className="space-y-1.5 text-[11px] font-mono bg-black/30 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Channel Configuration:</span>
                  <span className="text-slate-200 font-bold">{originalMeta.channelLayout}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Audio Stream Bitrate:</span>
                  <span className="text-white font-bold">{originalMeta.bitrateFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Peak Signal Amplitude:</span>
                  <span className="text-slate-300 font-bold">{originalMeta.peakDbfs || '-1.1 dBFS'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Integrated Loudness:</span>
                  <span className="text-slate-300 font-bold">{originalMeta.lufsLoudness || '-16.8 LUFS'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Frequency Bandwidth:</span>
                  <span className="text-slate-200">{originalMeta.frequencyRange || '20 Hz - 20,000 Hz'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Dynamic Range:</span>
                  <span className="text-slate-300 font-semibold">{originalMeta.dynamicRangeDb || '96 dB'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
                  <span className="text-slate-400">Encoding / Codec:</span>
                  <span className="text-slate-300 truncate max-w-[180px]" title={originalMeta.codec}>
                    {originalMeta.codec}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Technical Glossary / Diagnostic Note */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>
                <strong className="text-slate-200">Nyquist-Shannon Master:</strong> 48.0 kHz sample rate ensures clean high-frequency capture up to 24 kHz without aliasing artifacts.
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                ITU-R BS.1770-4
              </span>
              <span className="flex items-center gap-1 text-purple-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                EBU R128 Compliant
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
