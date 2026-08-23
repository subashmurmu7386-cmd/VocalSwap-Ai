import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  RotateCcw, 
  Share2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Check, 
  Copy, 
  Radio,
  FileVideo,
  FileAudio,
  Sliders,
  Maximize2
} from 'lucide-react';
import { VideoFileState, AudioSampleState, ConversionSettings, OutputMediaState, AudioTechnicalMetadata, GeminiAudioAnalysis } from '../types';
import { formatTime } from '../utils/audioUtils';
import { extractAudioTechnicalMetadata } from '../utils/audioMetadata';
import { AudioWaveformComparison } from './AudioWaveformComparison';
import { AudioTechnicalMetadataCard } from './AudioTechnicalMetadataCard';
import { AudioInspector } from './AudioInspector';
import { GeminiAnalysisCard } from './GeminiAnalysisCard';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';
import { ExportModal } from './ExportModal';
import { ShareToSocialModal } from './ShareToSocialModal';

interface OutputPreviewSectionProps {
  videoState: VideoFileState;
  voiceState: AudioSampleState;
  settings: ConversionSettings;
  outputMedia?: OutputMediaState | null;
  geminiAnalysis?: GeminiAudioAnalysis | null;
  onResetSwap: () => void;
  onOpenTranscriptEditor?: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'error') => void;
}

export const OutputPreviewSection: React.FC<OutputPreviewSectionProps> = ({
  videoState,
  voiceState,
  settings,
  outputMedia,
  geminiAnalysis,
  onResetSwap,
  onOpenTranscriptEditor,
  onShowToast,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoState.duration || 12);
  const [isMuted, setIsMuted] = useState(false);
  const [activeAudioTrack, setActiveAudioTrack] = useState<'swapped' | 'original'>('swapped');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [originalAudioMeta, setOriginalAudioMeta] = useState<AudioTechnicalMetadata | null>(null);
  const [swappedAudioMeta, setSwappedAudioMeta] = useState<AudioTechnicalMetadata | null>(null);

  // Active video source: use client-side muxed video if available, else original video url
  const activeVideoSrc = outputMedia?.videoUrl || videoState.url || '';

  useEffect(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || videoState.duration || 12);
    }
  }, [videoState, outputMedia]);

  // Extract detailed audio technical metadata (sample rate, bit depth, channel configuration, loudness)
  useEffect(() => {
    let isMounted = true;
    const dur = videoState.duration || duration || 10;

    extractAudioTechnicalMetadata(
      outputMedia?.originalAudioBlob || outputMedia?.originalAudioUrl || videoState.file || videoState.url,
      'original',
      dur
    ).then((meta) => {
      if (isMounted) setOriginalAudioMeta(meta);
    });

    extractAudioTechnicalMetadata(
      outputMedia?.convertedAudioBlob || outputMedia?.convertedAudioUrl || outputMedia?.videoBlob || outputMedia?.videoUrl,
      'swapped',
      dur
    ).then((meta) => {
      if (isMounted) setSwappedAudioMeta(meta);
    });

    return () => {
      isMounted = false;
    };
  }, [outputMedia, videoState, duration]);

  // Sync original audio track if playing in A/B original mode
  useEffect(() => {
    if (outputMedia?.originalAudioUrl) {
      const audio = new Audio(outputMedia.originalAudioUrl);
      originalAudioRef.current = audio;
      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [outputMedia?.originalAudioUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const handleToggleAudioTrack = (track: 'swapped' | 'original') => {
    setActiveAudioTrack(track);
    if (videoRef.current) {
      if (track === 'original') {
        // If user wants to hear original audio track
        if (outputMedia?.originalAudioUrl && originalAudioRef.current) {
          originalAudioRef.current.currentTime = videoRef.current.currentTime;
          if (!videoRef.current.paused) {
            originalAudioRef.current.play();
          }
        }
      } else {
        if (originalAudioRef.current) {
          originalAudioRef.current.pause();
        }
      }
    }
    onShowToast(
      track === 'swapped' ? 'A/B Audio: Swapped AI Voice Active' : 'A/B Audio: Original Voice Active',
      track === 'swapped' ? `Listening to ${voiceState.name} vocal clone (FFmpeg AAC 48kHz)` : 'Original raw audio track',
      'info'
    );
  };

  const handleDownload = (format: 'mp4' | 'wav' = 'mp4') => {
    setIsDownloading(true);
    onShowToast('Preparing Export...', `Exporting client-side WebAssembly ${format.toUpperCase()}`, 'info');

    setTimeout(() => {
      setIsDownloading(false);
      
      let downloadUrl = '';
      let filename = '';

      if (format === 'mp4') {
        if (outputMedia?.videoBlob) {
          downloadUrl = URL.createObjectURL(outputMedia.videoBlob);
        } else if (outputMedia?.videoUrl) {
          downloadUrl = outputMedia.videoUrl;
        } else {
          downloadUrl = videoState.url || '';
        }
        filename = `VocalSwap_${voiceState.name.replace(/\s+/g, '_')}_final.mp4`;
      } else {
        // WAV audio
        if (outputMedia?.convertedAudioBlob) {
          downloadUrl = URL.createObjectURL(outputMedia.convertedAudioBlob);
        } else if (outputMedia?.convertedAudioUrl) {
          downloadUrl = outputMedia.convertedAudioUrl;
        } else {
          downloadUrl = activeVideoSrc;
        }
        filename = `VocalSwap_${voiceState.name.replace(/\s+/g, '_')}_vocal_stem.wav`;
      }

      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      onShowToast('Download Complete!', `Saved ${filename} to your local drive.`, 'success');
    }, 600);
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setHasCopiedLink(true);
    onShowToast('Share Link Copied!', 'Direct preview URL copied to clipboard', 'success');
    setTimeout(() => setHasCopiedLink(false), 2500);
  };

  return (
    <section 
      id="section-step-4-output" 
      className="mt-10 max-w-5xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-6 duration-700"
    >
      {/* Result Card Container */}
      <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-[#00f0ff]/30 shadow-2xl relative overflow-hidden">
        {/* Top Header Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-[#00f0ff] p-[1px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full rounded-[15px] bg-slate-950/80 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Voice Swap Complete
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target Timbre: <span className="text-[#00f0ff] font-semibold">{voiceState.name}</span> • 48kHz Studio Master
              </p>
            </div>
          </div>

          {/* A/B Audio Comparison Switcher Pill */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner">
            <button
              id="btn-ab-swapped"
              onClick={() => handleToggleAudioTrack('swapped')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeAudioTrack === 'swapped'
                  ? 'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-white shadow-md shadow-[#00f0ff]/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ Swapped AI Voice</span>
            </button>

            <button
              id="btn-ab-original"
              onClick={() => handleToggleAudioTrack('original')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeAudioTrack === 'original'
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>🎙️ Original Audio</span>
            </button>
          </div>
        </div>

        {/* Video Player Box with Glass Overlay Controls */}
        <div className="mt-6 relative rounded-2xl overflow-hidden bg-black/90 border border-white/10 aspect-video shadow-2xl group/outplayer">
          <video
            ref={videoRef}
            src={activeVideoSrc || undefined}
            poster={videoState.thumbnailUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            muted={isMuted}
            className="w-full h-full object-contain"
            playsInline
          />

          {/* Active Audio Watermark Pill in Top Left */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <div className={`px-3 py-1 rounded-full backdrop-blur-md border text-[11px] font-mono font-semibold flex items-center gap-1.5 ${
              activeAudioTrack === 'swapped'
                ? 'bg-[#00f0ff]/20 border-[#00f0ff]/40 text-[#00f0ff] shadow-lg shadow-[#00f0ff]/20'
                : 'bg-white/10 border-white/20 text-slate-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${activeAudioTrack === 'swapped' ? 'bg-[#00f0ff] animate-ping' : 'bg-slate-400'}`} />
              <span>Audio: {activeAudioTrack === 'swapped' ? `AI Swapped (${voiceState.name})` : 'Original Track'}</span>
            </div>
          </div>

          {/* Big Center Play/Pause Overlay */}
          <button
            onClick={togglePlay}
            className={`absolute inset-0 m-auto w-16 h-16 rounded-full glass-panel flex items-center justify-center text-white border border-[#00f0ff]/50 shadow-2xl transition-all duration-300 ${
              isPlaying ? 'opacity-0 group-hover/outplayer:opacity-100' : 'opacity-100 scale-100'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-[#00f0ff]" />
            ) : (
              <Play className="w-7 h-7 text-[#00f0ff] translate-x-0.5" />
            )}
          </button>

          {/* Bottom Custom Glass Media Bar */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2">
            {/* Scrubber Range Bar */}
            <input
              type="range"
              min="0"
              max={duration || 10}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 rounded-full accent-[#00f0ff] bg-white/20 cursor-pointer"
            />

            {/* Media Bar Buttons */}
            <div className="flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="font-mono text-[11px] text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  1080p 60fps
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Audio Waveform & Spectrogram Visualizers (Side-by-Side Original vs. Converted) */}
        <AudioWaveformComparison
          originalAudioUrl={outputMedia?.originalAudioUrl}
          convertedAudioUrl={outputMedia?.convertedAudioUrl || outputMedia?.videoUrl}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          activeTrack={activeAudioTrack}
          voiceName={voiceState.name}
          pitchShift={settings.pitchShift}
          timbreFidelity={settings.timbreFidelity}
          genderMode={settings.genderMode}
          onSeek={(time) => {
            if (videoRef.current) {
              videoRef.current.currentTime = time;
              setCurrentTime(time);
            }
            if (originalAudioRef.current && activeAudioTrack === 'original') {
              originalAudioRef.current.currentTime = time;
            }
          }}
          onToggleTrack={handleToggleAudioTrack}
        />

        {/* Real-time Web Audio API Spectrum Visualizer with Time-Stretch Cadence Controls */}
        {(outputMedia?.convertedAudioUrl || outputMedia?.videoUrl) && (
          <div className="mt-4">
            <AudioWaveformVisualizer
              audioUrl={outputMedia?.convertedAudioUrl || outputMedia?.videoUrl}
              title={`Live Frequency Spectrum (${voiceState.name})`}
              subtitle="Interactive Web Audio API Spectrum & Time-Stretch Cadence Adjuster"
              accentColor="#00f0ff"
            />
          </div>
        )}

        {/* Audio Inspector Component */}
        {(outputMedia?.convertedAudioUrl || outputMedia?.videoUrl || videoState.url) && (
          <div className="mt-4">
            <AudioInspector
              audioUrl={outputMedia?.convertedAudioUrl || outputMedia?.videoUrl || videoState.url}
              title="Converted Output Audio Inspector"
              subtitle="Web Audio API Stream Telemetry (Sample Rate, Bitrate, Channel Configuration)"
            />
          </div>
        )}

        {/* Detailed Audio Technical Metadata (Sample Rate, Bit Depth, Channel Configuration) */}
        {originalAudioMeta && swappedAudioMeta && (
          <AudioTechnicalMetadataCard
            originalMeta={originalAudioMeta}
            swappedMeta={swappedAudioMeta}
            activeTrack={activeAudioTrack}
            voiceName={voiceState.name}
            onShowToast={onShowToast}
          />
        )}

        {/* Gemini Neural Script & Timing Intelligence Analysis */}
        {geminiAnalysis && (
          <GeminiAnalysisCard
            analysis={geminiAnalysis}
            onOpenTranscriptEditor={onOpenTranscriptEditor}
            onSeekToTimestamp={(time) => {
              if (videoRef.current) {
                videoRef.current.currentTime = time;
                setCurrentTime(time);
              }
              if (originalAudioRef.current && activeAudioTrack === 'original') {
                originalAudioRef.current.currentTime = time;
              }
            }}
            onShowToast={onShowToast}
          />
        )}

        {/* Action Controls & Download Area */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Master Export Button (Triggers Format & Quality Selector Modal) */}
            <div className="relative group/dl flex-1 sm:flex-initial">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] blur-md opacity-70 group-hover/dl:opacity-100 transition duration-300 animate-pulse" />
              <button
                id="btn-open-export-modal"
                onClick={() => setShowExportModal(true)}
                className="relative w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] text-white font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-white" />
                <span>Export & Master Video (.mp4, .webm, .mov)</span>
              </button>
            </div>

            {/* Quick Lossless MP4 Download */}
            <button
              id="btn-quick-download-mp4"
              onClick={() => {
                const downloadUrl = outputMedia?.videoUrl || videoState.url || '';
                if (downloadUrl) {
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = `VocalSwap_${voiceState.name.replace(/\s+/g, '_')}_master.mp4`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  onShowToast('Download Initiated', 'Saving master MP4 video stream', 'success');
                }
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl glass-panel hover:bg-white/10 border border-white/10 text-cyan-300 text-xs font-bold transition-all"
            >
              <FileVideo className="w-4 h-4" />
              <span>Quick MP4</span>
            </button>

            {/* Quick Stem Audio Download */}
            <button
              id="btn-quick-download-wav"
              onClick={() => {
                const audioUrl = outputMedia?.convertedAudioUrl || outputMedia?.videoUrl || '';
                if (audioUrl) {
                  const a = document.createElement('a');
                  a.href = audioUrl;
                  a.download = `VocalSwap_${voiceState.name.replace(/\s+/g, '_')}_vocal_stem.wav`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  onShowToast('Audio Stem Saved', 'Downloading 48kHz WAV audio', 'success');
                }
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl glass-panel hover:bg-white/10 border border-white/10 text-purple-300 text-xs font-bold transition-all"
            >
              <FileAudio className="w-4 h-4" />
              <span>WAV Stem</span>
            </button>

            {/* Share / Export Link */}
            <button
              id="btn-share-swap"
              onClick={() => setShowShareModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl glass-panel hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-medium transition-all"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>

          {/* Start New Swap Reset Button */}
          <button
            id="btn-reset-new-swap"
            onClick={onResetSwap}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl glass-panel-subtle hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-sm font-semibold transition-all"
          >
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <span>Start New Swap</span>
          </button>
        </div>
      </div>

      {/* Advanced Video Export Format & Quality Selector Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        videoSource={outputMedia?.videoBlob || videoState.file || videoState.url}
        audioSource={outputMedia?.convertedAudioBlob || outputMedia?.convertedAudioUrl || null}
        voiceName={voiceState.name}
        originalFileName={videoState.name || 'vocalswap_video'}
        onShowToast={onShowToast}
      />

      {/* Share To Social & Teaser Clip Generator Modal */}
      <ShareToSocialModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        videoSource={outputMedia?.videoBlob || videoState.file || videoState.url}
        audioSource={outputMedia?.convertedAudioBlob || outputMedia?.convertedAudioUrl || null}
        voiceName={voiceState.name}
        transcript={geminiAnalysis?.transcript}
        videoDuration={videoState.duration || 10}
        onShowToast={onShowToast}
      />
    </section>
  );
};
