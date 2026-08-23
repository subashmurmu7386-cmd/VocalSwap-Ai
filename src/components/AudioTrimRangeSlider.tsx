import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scissors, Play, Pause, RotateCcw, Clock, Volume2, Sparkles } from 'lucide-react';
import { formatTime } from '../utils/audioUtils';

interface AudioTrimRangeSliderProps {
  duration: number;
  trimRange: [number, number];
  audioUrl?: string | null;
  onChange: (range: [number, number]) => void;
  onPreviewPlay?: (startTime: number, endTime: number) => void;
}

export const AudioTrimRangeSlider: React.FC<AudioTrimRangeSliderProps> = ({
  duration,
  trimRange,
  audioUrl,
  onChange,
}) => {
  const [start, end] = trimRange;
  const safeDuration = Math.max(0.5, duration || 5);

  // Playback state within trimmed bounds
  const [isPlayingTrimmed, setIsPlayingTrimmed] = useState(false);
  const [currentPlayTime, setCurrentPlayTime] = useState(start);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<number | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, []);

  // Format seconds with sub-second precision (e.g. "0:02.4")
  const formatPreciseTime = (sec: number) => {
    const clamped = Math.max(0, Math.min(safeDuration, sec));
    const mins = Math.floor(clamped / 60);
    const secs = Math.floor(clamped % 60);
    const ms = Math.floor((clamped % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleStartChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(newVal, end - 0.3));
    onChange([Number(clamped.toFixed(1)), end]);
  };

  const handleEndChange = (newVal: number) => {
    const clamped = Math.min(safeDuration, Math.max(newVal, start + 0.3));
    onChange([start, Number(clamped.toFixed(1))]);
  };

  const handleReset = () => {
    onChange([0, Number(safeDuration.toFixed(1))]);
    if (isPlayingTrimmed && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingTrimmed(false);
    }
  };

  // Play only the selected trimmed audio interval
  const toggleTrimmedPlayback = useCallback(() => {
    if (isPlayingTrimmed) {
      if (audioRef.current) audioRef.current.pause();
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      setIsPlayingTrimmed(false);
    } else {
      if (audioUrl) {
        if (!audioRef.current) {
          audioRef.current = new Audio(audioUrl);
        }
        const audio = audioRef.current;
        audio.currentTime = start;
        setCurrentPlayTime(start);
        audio.play().catch(() => {});

        setIsPlayingTrimmed(true);

        if (playTimerRef.current) clearInterval(playTimerRef.current);
        playTimerRef.current = window.setInterval(() => {
          if (!audio) return;
          setCurrentPlayTime(audio.currentTime);
          if (audio.currentTime >= end || audio.ended) {
            audio.pause();
            audio.currentTime = start;
            setIsPlayingTrimmed(false);
            if (playTimerRef.current) clearInterval(playTimerRef.current);
          }
        }, 50);
      } else {
        // Fallback simulation timer if synthetic preset without direct file URL
        setIsPlayingTrimmed(true);
        setCurrentPlayTime(start);
        const trimmedLengthMs = (end - start) * 1000;
        const stepMs = 50;
        let elapsed = 0;
        if (playTimerRef.current) clearInterval(playTimerRef.current);
        playTimerRef.current = window.setInterval(() => {
          elapsed += stepMs;
          const curr = start + elapsed / 1000;
          setCurrentPlayTime(curr);
          if (elapsed >= trimmedLengthMs) {
            setIsPlayingTrimmed(false);
            setCurrentPlayTime(start);
            if (playTimerRef.current) clearInterval(playTimerRef.current);
          }
        }, stepMs);
      }
    }
  }, [isPlayingTrimmed, audioUrl, start, end]);

  const leftPercent = Math.min(100, Math.max(0, (start / safeDuration) * 100));
  const rightPercent = Math.min(100, Math.max(0, (1 - end / safeDuration) * 100));
  const playheadPercent = Math.min(100, Math.max(0, (currentPlayTime / safeDuration) * 100));
  const trimmedDuration = Math.max(0.1, end - start);

  return (
    <div 
      id="component-audio-trim-slider"
      className="p-3.5 rounded-xl glass-panel-subtle bg-slate-950/60 border border-white/10 space-y-3"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <Scissors className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span>Vocal Sample Trim</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
            {formatPreciseTime(trimmedDuration)} active
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Play Trimmed Segment */}
          <button
            type="button"
            onClick={toggleTrimmedPlayback}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
              isPlayingTrimmed
                ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Preview trimmed vocal clip"
          >
            {isPlayingTrimmed ? (
              <>
                <Pause className="w-3 h-3 text-[#00f0ff]" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-[#00f0ff]" />
                <span>Play Segment</span>
              </>
            )}
          </button>

          {/* Reset button */}
          {(start > 0 || end < safeDuration) && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 p-1 hover:bg-white/5 rounded transition-colors"
              title="Reset to full sample duration"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Visual Dual Range Slider Track */}
      <div className="relative pt-2 pb-1 px-1">
        {/* Track Background */}
        <div className="relative h-6 rounded-lg bg-slate-900 border border-white/10 overflow-hidden flex items-center">
          {/* Dimmed Left Out-of-bounds Zone */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/60 z-10 border-r border-cyan-400/40"
            style={{ width: `${leftPercent}%` }}
          />

          {/* Active Highlighted Trimmed Region */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-[#00f0ff]/30 via-[#a855f7]/30 to-[#ec4899]/30 border-y border-[#00f0ff]/50 z-0"
            style={{
              left: `${leftPercent}%`,
              right: `${rightPercent}%`,
            }}
          >
            {/* Visual tick stripes */}
            <div className="w-full h-full opacity-20 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,rgba(255,255,255,0.4)_4px,rgba(255,255,255,0.4)_6px)]" />
          </div>

          {/* Dimmed Right Out-of-bounds Zone */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/60 z-10 border-l border-pink-400/40"
            style={{ width: `${rightPercent}%` }}
          />

          {/* Dynamic Playhead Scrubber when playing */}
          {isPlayingTrimmed && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white z-20 shadow-[0_0_8px_#fff]"
              style={{ left: `${playheadPercent}%` }}
            />
          )}
        </div>

        {/* Start Handle Range Input */}
        <input
          id="slider-trim-start"
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={start}
          onChange={(e) => handleStartChange(parseFloat(e.target.value))}
          className="absolute inset-x-1 top-2 w-full h-6 opacity-0 cursor-ew-resize z-30 pointer-events-auto"
          style={{
            clipPath: `polygon(0 0, ${leftPercent + 10}% 0, ${leftPercent + 10}% 100%, 0 100%)`,
          }}
        />

        {/* End Handle Range Input */}
        <input
          id="slider-trim-end"
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={end}
          onChange={(e) => handleEndChange(parseFloat(e.target.value))}
          className="absolute inset-x-1 top-2 w-full h-6 opacity-0 cursor-ew-resize z-30 pointer-events-auto"
          style={{
            clipPath: `polygon(${100 - rightPercent - 10}% 0, 100% 0, 100% 100%, ${100 - rightPercent - 10}% 100%)`,
          }}
        />
      </div>

      {/* Dual Sliders & Precision Step Controls */}
      <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
        {/* Start Point Slider Control */}
        <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-cyan-500/20">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <span>Start:</span>
            </span>
            <span className="text-white font-bold">{formatPreciseTime(start)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, end - 0.3)}
            step={0.1}
            value={start}
            onChange={(e) => handleStartChange(parseFloat(e.target.value))}
            className="w-full accent-[#00f0ff] cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <button
              type="button"
              onClick={() => handleStartChange(start - 0.2)}
              className="hover:text-cyan-300 px-1 rounded bg-white/5"
            >
              -0.2s
            </button>
            <span>0.0s</span>
            <button
              type="button"
              onClick={() => handleStartChange(start + 0.2)}
              className="hover:text-cyan-300 px-1 rounded bg-white/5"
            >
              +0.2s
            </button>
          </div>
        </div>

        {/* End Point Slider Control */}
        <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-pink-500/20">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-pink-300 font-bold flex items-center gap-1">
              <span>End:</span>
            </span>
            <span className="text-white font-bold">{formatPreciseTime(end)}</span>
          </div>
          <input
            type="range"
            min={Math.min(safeDuration, start + 0.3)}
            max={safeDuration}
            step={0.1}
            value={end}
            onChange={(e) => handleEndChange(parseFloat(e.target.value))}
            className="w-full accent-[#ec4899] cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <button
              type="button"
              onClick={() => handleEndChange(end - 0.2)}
              className="hover:text-pink-300 px-1 rounded bg-white/5"
            >
              -0.2s
            </button>
            <span>{formatPreciseTime(safeDuration)}</span>
            <button
              type="button"
              onClick={() => handleEndChange(end + 0.2)}
              className="hover:text-pink-300 px-1 rounded bg-white/5"
            >
              +0.2s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
