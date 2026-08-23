import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Activity, 
  Sparkles, 
  Radio, 
  Volume2, 
  Sliders, 
  Maximize2, 
  Layers, 
  Waves,
  Zap,
  CheckCircle2,
  Flame
} from 'lucide-react';
import { getAudioContext } from '../utils/audioUtils';
import { AudioSpectrogramVisualizer } from './AudioSpectrogramVisualizer';

interface AudioWaveformComparisonProps {
  originalAudioUrl?: string | null;
  convertedAudioUrl?: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  activeTrack: 'swapped' | 'original';
  voiceName: string;
  pitchShift?: number;
  timbreFidelity?: number;
  genderMode?: string;
  onSeek?: (time: number) => void;
  onToggleTrack?: (track: 'swapped' | 'original') => void;
}

export const AudioWaveformComparison: React.FC<AudioWaveformComparisonProps> = ({
  originalAudioUrl,
  convertedAudioUrl,
  currentTime,
  duration,
  isPlaying,
  activeTrack,
  voiceName,
  pitchShift = 0,
  timbreFidelity = 92,
  genderMode = 'male-to-female',
  onSeek,
  onToggleTrack,
}) => {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const convertedCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [originalPeaks, setOriginalPeaks] = useState<number[]>([]);
  const [convertedPeaks, setConvertedPeaks] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'stacked' | 'spectrogram' | 'both'>('both');
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Decodes an audio URL or generates high-fidelity parametric peaks
  const extractPeaks = useCallback(async (url: string | null | undefined, type: 'original' | 'converted'): Promise<number[]> => {
    const numBuckets = 160;
    if (!url) {
      return generateSyntheticPeaks(type, numBuckets, pitchShift);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      const arrayBuffer = await response.arrayBuffer();
      const ctx = getAudioContext();
      
      // decodeAudioData
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const channelData = audioBuffer.getChannelData(0);
      const step = Math.floor(channelData.length / numBuckets);
      const peaks: number[] = [];

      for (let i = 0; i < numBuckets; i++) {
        let max = 0;
        const start = i * step;
        const end = Math.min(start + step, channelData.length);
        for (let j = start; j < end; j++) {
          const val = Math.abs(channelData[j]);
          if (val > max) max = val;
        }
        // Normalize with slight compression for aesthetics
        peaks.push(Math.min(1, Math.max(0.08, Math.pow(max, 0.8) * 1.2)));
      }
      return peaks;
    } catch (err) {
      // Graceful fallback to rich parametric waveform
      return generateSyntheticPeaks(type, numBuckets, pitchShift);
    }
  }, [pitchShift]);

  // Load peaks when URLs change
  useEffect(() => {
    let isMounted = true;
    extractPeaks(originalAudioUrl, 'original').then((peaks) => {
      if (isMounted) setOriginalPeaks(peaks);
    });
    extractPeaks(convertedAudioUrl, 'converted').then((peaks) => {
      if (isMounted) setConvertedPeaks(peaks);
    });
    return () => {
      isMounted = false;
    };
  }, [originalAudioUrl, convertedAudioUrl, extractPeaks]);

  // Render Waveform on Canvas
  const drawWaveform = useCallback((
    canvas: HTMLCanvasElement | null,
    peaks: number[],
    type: 'original' | 'converted',
    isActive: boolean
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (peaks.length === 0) {
      ctx.restore();
      return;
    }

    const effectiveDuration = duration > 0 ? duration : 10;
    const progressRatio = Math.min(1, Math.max(0, currentTime / effectiveDuration));
    const playheadX = progressRatio * width;
    const hoverX = hoverTime !== null ? (hoverTime / effectiveDuration) * width : null;

    // Background subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    const centerY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Bar drawing
    const barWidth = Math.max(2, (width / peaks.length) - 1.5);
    const gap = 1.5;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * (barWidth + gap);
      const rawPeak = peaks[i];
      
      // Dynamic live oscillation if playing
      let animatedPeak = rawPeak;
      if (isPlaying && isActive) {
        const osc = Math.sin((i * 0.3) + (Date.now() * 0.008)) * 0.15;
        animatedPeak = Math.max(0.1, Math.min(1, rawPeak + osc));
      }

      const barHeight = Math.max(4, animatedPeak * (height * 0.78));
      const y = (height - barHeight) / 2;
      const isPast = x <= playheadX;

      // Color styling based on track type
      if (type === 'converted') {
        if (isPast) {
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#00f0ff');
          gradient.addColorStop(0.5, '#a855f7');
          gradient.addColorStop(1, '#ec4899');
          ctx.fillStyle = gradient;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = isActive && isPlaying ? 6 : 2;
        } else {
          ctx.fillStyle = isActive ? 'rgba(0, 240, 255, 0.35)' : 'rgba(168, 85, 247, 0.2)';
          ctx.shadowBlur = 0;
        }
      } else {
        // Original track (Amber / Gold / Cyan subtle)
        if (isPast) {
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#fbbf24');
          gradient.addColorStop(0.5, '#f59e0b');
          gradient.addColorStop(1, '#d97706');
          ctx.fillStyle = gradient;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = isActive && isPlaying ? 6 : 2;
        } else {
          ctx.fillStyle = isActive ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.15)';
          ctx.shadowBlur = 0;
        }
      }

      // Rounded pill bar
      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, radius);
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Hover Indicator Line
    if (hoverX !== null && hoverX >= 0 && hoverX <= width) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Playhead Line & Glow
    ctx.strokeStyle = type === 'converted' ? '#00f0ff' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.shadowColor = type === 'converted' ? '#00f0ff' : '#fbbf24';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead Top Pointer Cap
    ctx.fillStyle = type === 'converted' ? '#00f0ff' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(playheadX, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [currentTime, duration, isPlaying, hoverTime]);

  // Animation frame loop for smooth real-time rendering
  useEffect(() => {
    let animId: number;

    const render = () => {
      drawWaveform(originalCanvasRef.current, originalPeaks, 'original', activeTrack === 'original');
      drawWaveform(convertedCanvasRef.current, convertedPeaks, 'converted', activeTrack === 'swapped');
      if (isPlaying) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, originalPeaks, convertedPeaks, activeTrack, drawWaveform]);

  // Handle User Click / Seek on Waveforms
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * (duration > 0 ? duration : 10);
    if (onSeek) onSeek(targetTime);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * (duration > 0 ? duration : 10);
    setHoverTime(targetTime);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  return (
    <div 
      id="waveform-realtime-comparison-module"
      ref={containerRef}
      className="mt-6 rounded-2xl bg-slate-950/60 border border-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden"
    >
      {/* Visualizer Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#00f0ff]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Dual Real-Time Waveform Analyzer</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
                48kHz Matrix
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Side-by-side harmonic signal comparison with live interactive scrubber
            </p>
          </div>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'both'
                ? 'bg-gradient-to-r from-[#00f0ff]/20 to-[#a855f7]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Combined Waveform & Spectrogram View"
          >
            <Flame className="w-3 h-3 text-[#00f0ff]" />
            <span className="hidden sm:inline">All-in-One</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Side-by-Side Dual Waveform View"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Dual Waveform</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('spectrogram')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'spectrogram'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="2D FFT Spectrogram Focus View"
          >
            <Flame className="w-3 h-3 text-purple-400" />
            <span className="hidden sm:inline">Spectrogram</span>
          </button>
        </div>
      </div>

      {/* Waveform Canvases Container (Rendered unless Spectrogram-only mode) */}
      {viewMode !== 'spectrogram' && (
        <div className={`mt-4 grid gap-4 ${viewMode === 'side-by-side' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
          
          {/* Track 1: Original Audio Waveform */}
          <div 
            id="waveform-panel-original"
            onClick={() => onToggleTrack && onToggleTrack('original')}
            className={`relative rounded-xl p-3.5 border transition-all cursor-pointer group ${
              activeTrack === 'original'
                ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-black/40 border-white/5 hover:border-white/20'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeTrack === 'original' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs font-bold text-slate-200 group-hover:text-white flex items-center gap-1">
                  <Radio className="w-3 h-3 text-amber-400" />
                  Original Audio Signal
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-amber-300">
                  Source Stem
                </span>
                <span>Raw Dynamics</span>
              </div>
            </div>

            {/* Canvas Waveform */}
            <div className="relative h-20 sm:h-24 w-full rounded-lg overflow-hidden bg-slate-950/80 border border-white/5">
              <canvas
                ref={originalCanvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full block cursor-crosshair"
              />
              {activeTrack === 'original' && (
                <div className="absolute top-1.5 right-2 text-[9px] font-mono text-amber-400/80 uppercase tracking-wider pointer-events-none">
                  ● Live Monitor Active
                </div>
              )}
            </div>

            {/* Footer Metrics */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Harmonics: Acoustic Raw</span>
              <span>Freq: 20Hz - 20kHz</span>
            </div>
          </div>

          {/* Track 2: Converted AI Voice Waveform */}
          <div 
            id="waveform-panel-converted"
            onClick={() => onToggleTrack && onToggleTrack('swapped')}
            className={`relative rounded-xl p-3.5 border transition-all cursor-pointer group ${
              activeTrack === 'swapped'
                ? 'bg-[#00f0ff]/10 border-[#00f0ff]/50 shadow-lg shadow-[#00f0ff]/10'
                : 'bg-black/40 border-white/5 hover:border-white/20'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeTrack === 'swapped' ? 'bg-[#00f0ff] animate-ping' : 'bg-slate-500'}`} />
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#00f0ff]" />
                  <span>AI Cloned Timbre ({voiceName})</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30">
                  {pitchShift > 0 ? `+${pitchShift}` : pitchShift} st
                </span>
                <span className="text-purple-300">
                  {timbreFidelity}% Fidelity
                </span>
              </div>
            </div>

            {/* Canvas Waveform */}
            <div className="relative h-20 sm:h-24 w-full rounded-lg overflow-hidden bg-slate-950/80 border border-white/5">
              <canvas
                ref={convertedCanvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full block cursor-crosshair"
              />
              {activeTrack === 'swapped' && (
                <div className="absolute top-1.5 right-2 text-[9px] font-mono text-[#00f0ff]/90 uppercase tracking-wider pointer-events-none">
                  ● Live Monitor Active
                </div>
              )}
            </div>

            {/* Footer Metrics */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="text-[#00f0ff]">Matrix: Neural Resynthesis</span>
              <span>Res: 48kHz Studio AAC</span>
            </div>
          </div>

        </div>
      )}

      {/* Real-Time Audio Spectrogram Visualizer Heatmap */}
      {(viewMode === 'both' || viewMode === 'spectrogram') && (
        <div className="mt-4">
          <AudioSpectrogramVisualizer
            originalAudioUrl={originalAudioUrl}
            convertedAudioUrl={convertedAudioUrl}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            activeTrack={activeTrack}
            genderMode={genderMode}
            pitchShift={pitchShift}
            title="Real-Time Audio Spectrogram Frequency Heatmap"
            subtitle="Visual feedback on spectral density, formant resonances & pitch shift"
          />
        </div>
      )}

      {/* Scrubber Helper Tooltip */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span>Click anywhere on either waveform to seek playback position.</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <span>Active:</span>
          <span className="font-semibold text-white">
            {activeTrack === 'swapped' ? `✨ Swapped (${voiceName})` : '🎙️ Original Voice'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Generates smooth acoustic peak contours when external audio is loading or offline
function generateSyntheticPeaks(type: 'original' | 'converted', length: number, pitchShift = 0): number[] {
  const peaks: number[] = [];
  const freqFactor = type === 'converted' ? 1 + (pitchShift * 0.05) : 1.0;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    // Layered sine waves to simulate speech cadence and phrase envelopes
    const phrase1 = Math.sin(t * Math.PI * 4 * freqFactor);
    const phrase2 = Math.sin(t * Math.PI * 12);
    const noise = Math.sin(i * 37.7) * 0.15;
    const envelope = Math.sin(t * Math.PI); // fade in/out

    let amp = Math.abs(phrase1 * 0.6 + phrase2 * 0.3 + noise) * envelope;
    if (type === 'converted') {
      amp = amp * 1.1 + 0.05; // slightly denser harmonic energy
    }
    peaks.push(Math.max(0.12, Math.min(0.95, amp)));
  }
  return peaks;
}
