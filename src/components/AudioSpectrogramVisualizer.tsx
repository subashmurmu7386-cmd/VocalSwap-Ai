import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Activity, Flame, Radio, Sparkles, Zap, Sliders, Waves, Layers } from 'lucide-react';
import { getAudioContext } from '../utils/audioUtils';

interface AudioSpectrogramVisualizerProps {
  originalAudioUrl?: string | null;
  convertedAudioUrl?: string | null;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  activeTrack?: 'swapped' | 'original';
  genderMode?: string;
  pitchShift?: number;
  title?: string;
  subtitle?: string;
}

export const AudioSpectrogramVisualizer: React.FC<AudioSpectrogramVisualizerProps> = ({
  originalAudioUrl,
  convertedAudioUrl,
  currentTime = 0,
  duration = 10,
  isPlaying = false,
  activeTrack = 'swapped',
  genderMode = 'male-to-female',
  pitchShift = 5,
  title = 'Real-Time Audio Spectrogram',
  subtitle = 'Frequency Content & Formant Shift Heatmap (0 - 10 kHz)',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [colorScheme, setColorScheme] = useState<'cyber' | 'thermal' | 'emerald'>('cyber');
  const [scaleMode, setScaleMode] = useState<'log' | 'linear'>('log');
  const [dominantFreq, setDominantFreq] = useState<number>(genderMode === 'male-to-female' ? 240 : 120);

  // Frequency history buffer for waterfall rendering
  const historyBufferRef = useRef<Uint8Array[]>([]);
  const maxHistoryFrames = 120; // Number of time slices on X-axis

  const activeUrl = activeTrack === 'swapped'
    ? (convertedAudioUrl || originalAudioUrl)
    : (originalAudioUrl || convertedAudioUrl);

  // Color mapping functions for spectrogram intensity (0 - 255)
  const getHeatmapColor = useCallback((value: number, scheme: 'cyber' | 'thermal' | 'emerald') => {
    const norm = value / 255;
    if (scheme === 'cyber') {
      // Dark Navy -> Deep Purple -> Cyan -> Bright Pink -> White
      if (norm < 0.1) return [10, 15, 30, 255];
      if (norm < 0.35) {
        const t = (norm - 0.1) / 0.25;
        return [Math.floor(168 * t), Math.floor(85 * t), Math.floor(247 * t), 255];
      }
      if (norm < 0.7) {
        const t = (norm - 0.35) / 0.35;
        return [Math.floor(0 + 236 * t), Math.floor(240 * (1 - t) + 72 * t), Math.floor(255 * (1 - t) + 153 * t), 255];
      }
      const t = (norm - 0.7) / 0.3;
      return [255, Math.floor(200 + 55 * t), Math.floor(220 + 35 * t), 255];
    } else if (scheme === 'thermal') {
      // Black -> Blue -> Red -> Orange -> Yellow -> White
      if (norm < 0.15) return [12, 12, 30, 255];
      if (norm < 0.4) {
        const t = (norm - 0.15) / 0.25;
        return [Math.floor(220 * t), Math.floor(38 * t), Math.floor(38 * t), 255];
      }
      if (norm < 0.75) {
        const t = (norm - 0.4) / 0.35;
        return [245, Math.floor(158 * t), 11, 255];
      }
      const t = (norm - 0.75) / 0.25;
      return [255, Math.floor(220 + 35 * t), Math.floor(150 + 105 * t), 255];
    } else {
      // Emerald / Matrix
      if (norm < 0.1) return [5, 20, 15, 255];
      if (norm < 0.5) {
        const t = (norm - 0.1) / 0.4;
        return [Math.floor(16 * t), Math.floor(185 * t), Math.floor(129 * t), 255];
      }
      const t = (norm - 0.5) / 0.5;
      return [Math.floor(52 + 200 * t), 211, Math.floor(153 + 102 * t), 255];
    }
  }, []);

  // Web Audio API Setup
  useEffect(() => {
    if (!audioRef.current || !activeUrl) return;

    const audio = audioRef.current;

    const handlePlay = () => {
      if (!audioCtxRef.current) {
        try {
          const ctx = getAudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.75;

          const source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(ctx.destination);

          audioCtxRef.current = ctx;
          analyserRef.current = analyser;
          sourceNodeRef.current = source;
        } catch (err) {
          console.warn('[Spectrogram] Web Audio API init note:', err);
        }
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    audio.addEventListener('play', handlePlay);
    return () => {
      audio.removeEventListener('play', handlePlay);
    };
  }, [activeUrl]);

  // Main Spectrogram Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fftBins = 128;
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      let currentFreqData = new Uint8Array(fftBins);

      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(currentFreqData);

        // Estimate dominant fundamental frequency (F0)
        let maxVal = 0;
        let maxIndex = 0;
        for (let i = 2; i < 40; i++) {
          if (currentFreqData[i] > maxVal) {
            maxVal = currentFreqData[i];
            maxIndex = i;
          }
        }
        if (maxVal > 50) {
          const nyquist = (audioCtxRef.current?.sampleRate || 44100) / 2;
          const freqHz = Math.round((maxIndex / fftBins) * nyquist);
          if (freqHz > 70 && freqHz < 2000) {
            setDominantFreq(freqHz);
          }
        }
      } else {
        // Generate parametric spectral energy frames for preview state
        const timeFactor = Date.now() * 0.003;
        const targetBase = activeTrack === 'swapped'
          ? (genderMode === 'male-to-female' ? 240 : 110)
          : (genderMode === 'male-to-female' ? 120 : 220);

        setDominantFreq(targetBase);

        for (let i = 0; i < fftBins; i++) {
          const normFreq = i / fftBins;
          // Harmonic peak around target fundamental & formants
          const f0Bin = (targetBase / 22050) * fftBins;
          const f1Bin = f0Bin * 3;
          const f2Bin = f0Bin * 5;

          const distF0 = Math.exp(-Math.pow(i - f0Bin, 2) / 4);
          const distF1 = Math.exp(-Math.pow(i - f1Bin, 2) / 12);
          const distF2 = Math.exp(-Math.pow(i - f2Bin, 2) / 20);

          const noise = Math.sin(i * 0.4 + timeFactor) * 20;
          const envelope = isPlaying ? (0.7 + Math.sin(timeFactor * 2) * 0.3) : 0.45;

          const intensity = Math.min(255, Math.max(15, (distF0 * 220 + distF1 * 160 + distF2 * 110 + noise) * envelope));
          currentFreqData[i] = intensity;
        }
      }

      // Append new slice to history buffer
      historyBufferRef.current.unshift(currentFreqData);
      if (historyBufferRef.current.length > maxHistoryFrames) {
        historyBufferRef.current.pop();
      }

      // Draw 2D Spectrogram Heatmap Image
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      const historyLen = historyBufferRef.current.length;
      const sliceWidth = width / maxHistoryFrames;

      for (let xFrame = 0; xFrame < historyLen; xFrame++) {
        const frameData = historyBufferRef.current[xFrame];
        const xPos = Math.floor(width - (xFrame * sliceWidth));

        for (let y = 0; y < height; y++) {
          // Y-axis: bottom is 0 Hz, top is Nyquist (~11kHz / 22kHz)
          const normY = (height - 1 - y) / height;

          let binIndex = 0;
          if (scaleMode === 'log') {
            // Logarithmic pitch scaling (gives more resolution to vocal pitch F0 and F1 formants)
            binIndex = Math.floor(Math.pow(normY, 1.8) * (fftBins - 1));
          } else {
            binIndex = Math.floor(normY * (fftBins - 1));
          }

          binIndex = Math.max(0, Math.min(fftBins - 1, binIndex));
          const val = frameData[binIndex] || 0;

          const [r, g, b, a] = getHeatmapColor(val, colorScheme);

          // Render column slice
          for (let sw = 0; sw < Math.ceil(sliceWidth); sw++) {
            const px = xPos - sw;
            if (px >= 0 && px < width) {
              const pixelIndex = (y * width + px) * 4;
              data[pixelIndex] = r;
              data[pixelIndex + 1] = g;
              data[pixelIndex + 2] = b;
              data[pixelIndex + 3] = a;
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Draw Frequency Axis Label Overlay Lines (100Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '9px monospace';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      const freqMarkers = [
        { label: '8 kHz', hz: 8000 },
        { label: '4 kHz', hz: 4000 },
        { label: '2 kHz', hz: 2000 },
        { label: '1 kHz', hz: 1000 },
        { label: '500 Hz', hz: 500 },
        { label: '100 Hz', hz: 100 },
      ];

      freqMarkers.forEach((m) => {
        const nyquist = 11025; // Approximate focal voice spectrum range
        const normHz = Math.min(1, m.hz / nyquist);

        let yPos = 0;
        if (scaleMode === 'log') {
          yPos = height - (Math.pow(normHz, 1 / 1.8) * height);
        } else {
          yPos = height - (normHz * height);
        }

        if (yPos > 10 && yPos < height - 10) {
          ctx.beginPath();
          ctx.moveTo(32, yPos);
          ctx.lineTo(width, yPos);
          ctx.stroke();

          ctx.fillText(m.label, 4, yPos + 3);
        }
      });

      // Dominant Pitch / Formant Indicator Horizontal Line
      const normDom = Math.min(1, dominantFreq / 11025);
      let domY = 0;
      if (scaleMode === 'log') {
        domY = height - (Math.pow(normDom, 1 / 1.8) * height);
      } else {
        domY = height - (normDom * height);
      }

      if (domY > 5 && domY < height - 5) {
        ctx.strokeStyle = activeTrack === 'swapped' ? '#00f0ff' : '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(35, domY);
        ctx.lineTo(width, domY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = activeTrack === 'swapped' ? '#00f0ff' : '#f59e0b';
        ctx.fillText(`F0: ${dominantFreq} Hz`, width - 75, domY - 4);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, activeTrack, genderMode, colorScheme, scaleMode, getHeatmapColor, dominantFreq]);

  return (
    <div 
      id="panel-audio-spectrogram-visualizer"
      className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-white/10 shadow-2xl backdrop-blur-md space-y-3 relative overflow-hidden"
    >
      <audio ref={audioRef} src={activeUrl || undefined} crossOrigin="anonymous" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00f0ff]/20 via-[#a855f7]/20 to-[#ec4899]/20 border border-white/15 flex items-center justify-center text-[#00f0ff]">
            <Flame className="w-4 h-4 text-[#00f0ff]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                2D FFT Heatmap
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Customization Quick Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {/* Color Scheme Picker */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-white/10">
            <button
              type="button"
              onClick={() => setColorScheme('cyber')}
              className={`px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                colorScheme === 'cyber' ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold border border-[#00f0ff]/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cyber
            </button>
            <button
              type="button"
              onClick={() => setColorScheme('thermal')}
              className={`px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                colorScheme === 'thermal' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Thermal
            </button>
            <button
              type="button"
              onClick={() => setColorScheme('emerald')}
              className={`px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                colorScheme === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Matrix
            </button>
          </div>

          {/* Scale Mode Picker */}
          <button
            type="button"
            onClick={() => setScaleMode(scaleMode === 'log' ? 'linear' : 'log')}
            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 text-[10px] font-bold"
          >
            {scaleMode === 'log' ? 'Log Scale' : 'Linear'}
          </button>
        </div>
      </div>

      {/* Spectrogram Canvas Wrapper */}
      <div className="relative h-36 sm:h-44 w-full rounded-xl bg-black/90 border border-white/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          className="w-full h-full object-cover block"
        />

        {/* Live Active Overlay Pill */}
        <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none">
          <div className="px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-white/15 text-[10px] font-mono text-slate-300 flex items-center gap-1.5 shadow-lg">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[#00f0ff] animate-ping' : 'bg-slate-500'}`} />
            <span>
              Track: <strong className="text-white capitalize">{activeTrack}</strong>
            </span>
            <span className="text-purple-300">
              ({genderMode === 'male-to-female' ? 'M➔F Formant' : genderMode === 'female-to-male' ? 'F➔M Baritone' : 'Custom'})
            </span>
          </div>
        </div>

        {/* Bottom Time Axis Markers */}
        <div className="absolute bottom-1 right-2 left-10 flex justify-between text-[9px] font-mono text-slate-400/80 pointer-events-none">
          <span>-10s</span>
          <span>-5s</span>
          <span>Now (Live Stream)</span>
        </div>
      </div>

      {/* Frequency Shift & Formant Explainer Badge */}
      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 font-mono">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300">
            Current Dominant $F_0$: <strong className="text-[#00f0ff]">{dominantFreq} Hz</strong>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            Formant Shift Target: <strong className="text-pink-300">{pitchShift > 0 ? `+${pitchShift}` : pitchShift} Semitones</strong>
          </span>
        </div>

        <div className="text-[10px] text-slate-400">
          {genderMode === 'male-to-female'
            ? '⚡ High energy bands shifted upward into 2kHz - 5kHz female formant zone.'
            : genderMode === 'female-to-male'
            ? '⚡ Low frequency fundamental energy concentrated in 80Hz - 250Hz baritone chest resonance.'
            : '⚡ Direct acoustic spectral energy mapping from reference voice profile.'}
        </div>
      </div>
    </div>
  );
};
