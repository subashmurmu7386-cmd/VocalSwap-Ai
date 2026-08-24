import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Film,
  FileVideo,
  FileAudio,
  CheckCircle2,
  RotateCcw,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { ConversionRecord } from '../lib/firestore';
import { VaultPreviewModal } from './VaultPreviewModal';

export { VaultPreviewModal };

export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: ConversionRecord | null;
  videoUrl?: string | null;
  videoBlob?: Blob | Uint8Array | null;
  convertedAudioUrl?: string | null;
  originalAudioUrl?: string | null;
  originalVideoName?: string;
  targetVoiceName?: string;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'error') => void;
}

export type ExportFormat = 'mp4' | 'webm' | 'mov';

/**
 * Resolves raw Uint8Array, Blob, or URL string into a sanitized Object URL
 * with explicit video/mp4 MIME type declaration.
 */
function prepareVideoObjectURL(
  source?: Blob | Uint8Array | string | null,
  fallbackUrl?: string | null
): { objectUrl: string; cleanUpNeeded: boolean } {
  if (!source && !fallbackUrl) {
    return { objectUrl: '', cleanUpNeeded: false };
  }

  // Handle Uint8Array raw FFmpeg binary buffer
  if (source instanceof Uint8Array) {
    const mp4Blob = new Blob([source.buffer], { type: 'video/mp4' });
    return { objectUrl: URL.createObjectURL(mp4Blob), cleanUpNeeded: true };
  }

  // Handle Blob
  if (source instanceof Blob) {
    const mimeType = source.type && source.type.startsWith('video/') ? source.type : 'video/mp4';
    const mp4Blob = new Blob([source], { type: mimeType });
    return { objectUrl: URL.createObjectURL(mp4Blob), cleanUpNeeded: true };
  }

  // Handle string URL
  if (typeof source === 'string' && source.trim().length > 0) {
    return { objectUrl: source, cleanUpNeeded: false };
  }

  if (typeof fallbackUrl === 'string' && fallbackUrl.trim().length > 0) {
    return { objectUrl: fallbackUrl, cleanUpNeeded: false };
  }

  return { objectUrl: '', cleanUpNeeded: false };
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  record,
  videoUrl,
  videoBlob,
  convertedAudioUrl,
  originalAudioUrl,
  originalVideoName,
  targetVoiceName,
  onShowToast,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const standaloneAudioRef = useRef<HTMLAudioElement | null>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);

  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isPlayingStandaloneAudio, setIsPlayingStandaloneAudio] = useState(false);
  const [activeAudioTrack, setActiveAudioTrack] = useState<'swapped' | 'original'>('swapped');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Extract variables from record or individual props
  const activeVideoName = record?.originalVideoName || originalVideoName || 'swapped_vocal_output';
  const activeVoiceName = record?.targetVoiceName || targetVoiceName || 'AI Cloned Voice';
  const activeConvertedAudioUrl = record?.convertedAudioUrl || convertedAudioUrl;
  const activeOriginalAudioUrl = record?.originalAudioUrl || originalAudioUrl;

  // Prepare & repair video Blob URL with explicit video/mp4 MIME type
  useEffect(() => {
    if (!isOpen) return;

    const source = videoBlob || videoUrl || record?.convertedVideoUrl || record?.originalVideoUrl;
    const { objectUrl, cleanUpNeeded } = prepareVideoObjectURL(source, record?.originalVideoUrl);
    setResolvedVideoUrl(objectUrl);

    return () => {
      if (cleanUpNeeded && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, videoBlob, videoUrl, record]);

  // Sync original audio track if compare mode is set to 'original'
  useEffect(() => {
    if (activeOriginalAudioUrl) {
      const audio = new Audio(activeOriginalAudioUrl);
      originalAudioRef.current = audio;
      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [activeOriginalAudioUrl]);

  // Sync standalone converted audio
  useEffect(() => {
    if (activeConvertedAudioUrl) {
      const audio = new Audio(activeConvertedAudioUrl);
      audio.onended = () => setIsPlayingStandaloneAudio(false);
      standaloneAudioRef.current = audio;
      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [activeConvertedAudioUrl]);

  if (!isOpen) return null;

  // Toggle Video Play/Pause
  const togglePlayVideo = () => {
    if (!videoRef.current) return;

    if (isPlayingStandaloneAudio && standaloneAudioRef.current) {
      standaloneAudioRef.current.pause();
      setIsPlayingStandaloneAudio(false);
    }

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlayingVideo(true);
        if (activeAudioTrack === 'original' && originalAudioRef.current) {
          originalAudioRef.current.currentTime = videoRef.current?.currentTime || 0;
          originalAudioRef.current.play();
        }
      }).catch((err) => {
        console.warn('Video playback error:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlayingVideo(false);
      if (originalAudioRef.current) {
        originalAudioRef.current.pause();
      }
    }
  };

  // Toggle Compare Audio Switcher
  const handleToggleAudioTrack = (track: 'swapped' | 'original') => {
    setActiveAudioTrack(track);

    if (videoRef.current) {
      if (track === 'original') {
        videoRef.current.muted = true;
        if (originalAudioRef.current) {
          originalAudioRef.current.currentTime = videoRef.current.currentTime;
          if (!videoRef.current.paused) {
            originalAudioRef.current.play();
          }
        }
      } else {
        videoRef.current.muted = isMuted;
        if (originalAudioRef.current) {
          originalAudioRef.current.pause();
        }
      }
    }

    if (onShowToast) {
      onShowToast(
        track === 'swapped' ? 'A/B Audio: AI Swapped Voice Active' : 'A/B Audio: Original Voice Active',
        track === 'swapped' ? `Listening to ${activeVoiceName} vocal clone` : 'Original audio track',
        'info'
      );
    }
  };

  // Toggle Standalone Audio Playback
  const togglePlayStandaloneAudio = () => {
    if (!activeConvertedAudioUrl) {
      if (onShowToast) onShowToast('Audio Unavailable', 'No standalone converted audio track found.', 'error');
      return;
    }

    // Pause video if playing
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlayingVideo(false);
    }

    if (!standaloneAudioRef.current) {
      standaloneAudioRef.current = new Audio(activeConvertedAudioUrl);
      standaloneAudioRef.current.onended = () => setIsPlayingStandaloneAudio(false);
    }

    if (isPlayingStandaloneAudio) {
      standaloneAudioRef.current.pause();
      setIsPlayingStandaloneAudio(false);
    } else {
      standaloneAudioRef.current.play().then(() => {
        setIsPlayingStandaloneAudio(true);
      }).catch((err) => {
        console.warn('Standalone audio play error:', err);
      });
    }
  };

  // Direct File Download Handler with Format Selector
  const handleDownloadVideo = () => {
    if (!resolvedVideoUrl) {
      if (onShowToast) onShowToast('Download Failed', 'No valid video source URL available.', 'error');
      return;
    }

    const sanitizedBaseName = activeVideoName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
    
    const filename = `swapped_vocal_output_${sanitizedBaseName}.${exportFormat}`;

    if (onShowToast) {
      onShowToast('Preparing Download', `Exporting video stream as .${exportFormat.toUpperCase()}`, 'info');
    }

    // Trigger direct browser file download
    const a = document.createElement('a');
    a.href = resolvedVideoUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (onShowToast) {
      onShowToast('Download Started!', `Saving ${filename} to your device.`, 'success');
    }
  };

  return (
    <div
      id="modal-preview-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="modal-preview-container"
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl glass-panel border border-[#00f0ff]/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-slate-950/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00f0ff]/20 to-[#a855f7]/20 border border-[#00f0ff]/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>VocalSwap Video Vault Preview</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Session: <span className="text-white font-medium">{activeVideoName}</span> • Cloned: <span className="text-[#00f0ff] font-medium">{activeVoiceName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Media Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Main HTML5 Video Player */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/90 border border-white/15 shadow-2xl group/prevplayer">
            {resolvedVideoUrl ? (
              <video
                ref={videoRef}
                src={resolvedVideoUrl}
                controls
                playsInline
                preload="metadata"
                autoPlay
                onPlay={() => setIsPlayingVideo(true)}
                onPause={() => setIsPlayingVideo(false)}
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) setDuration(videoRef.current.duration || 0);
                }}
                className="w-full h-auto max-h-[420px] rounded-xl bg-black border border-slate-700/60 shadow-xl"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <FileVideo className="w-12 h-12 text-[#00f0ff] animate-pulse mb-3" />
                <p className="text-sm font-semibold text-white mb-1">Loading Video Stream...</p>
                <p className="text-xs text-slate-400">Decoding WebAssembly video container buffer</p>
              </div>
            )}

            {/* Audio Track Watermark Badge */}
            <div className="absolute top-3 left-3 z-10 pointer-events-none">
              <div className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                activeAudioTrack === 'swapped'
                  ? 'bg-[#00f0ff]/20 border-[#00f0ff]/40 text-[#00f0ff] shadow-lg shadow-[#00f0ff]/20'
                  : 'bg-white/10 border-white/20 text-slate-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${activeAudioTrack === 'swapped' ? 'bg-[#00f0ff] animate-ping' : 'bg-slate-400'}`} />
                <span>Track: {activeAudioTrack === 'swapped' ? `AI Swapped (${activeVoiceName})` : 'Original Voice'}</span>
              </div>
            </div>
          </div>

          {/* High-Visibility Glassmorphic Action Control Panel */}
          <div className="p-4 rounded-2xl glass-panel border border-[#00f0ff]/30 shadow-xl space-y-4 bg-slate-900/90">
            {/* Top Action Row: Audio Mode Switchers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              {/* Compare Audio Switcher */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#00f0ff]" /> Compare Audio Track:
                </span>
                <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleToggleAudioTrack('swapped')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeAudioTrack === 'swapped'
                        ? 'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-white shadow-md shadow-[#00f0ff]/20 scale-[1.02]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>✨ Swapped AI Voice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleAudioTrack('original')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeAudioTrack === 'original'
                        ? 'bg-white/20 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>🎙️ Original Voice</span>
                  </button>
                </div>
              </div>

              {/* Play Swapped Audio Only Toggle Button */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FileAudio className="w-3 h-3 text-purple-400" /> Audio Stem Preview:
                </span>
                <button
                  type="button"
                  onClick={togglePlayStandaloneAudio}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isPlayingStandaloneAudio
                      ? 'bg-purple-500/30 text-purple-200 border-purple-500/50 animate-pulse shadow-lg shadow-purple-500/20'
                      : 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                  }`}
                >
                  {isPlayingStandaloneAudio ? (
                    <>
                      <Pause className="w-4 h-4 text-purple-300" />
                      <span>Pause Swapped Audio Only</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-purple-300" />
                      <span>Play Swapped Audio Only</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Action Row: Download Video & Export Format Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Format Dropdown Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5 shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-[#00f0ff]" /> Format:
                </span>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                  className="bg-black/70 text-xs font-mono font-bold text-[#00f0ff] px-3 py-2.5 rounded-xl border border-[#00f0ff]/30 focus:outline-none focus:border-[#00f0ff] cursor-pointer"
                >
                  <option value="mp4">MP4 Video (.mp4)</option>
                  <option value="webm">WebM Video (.webm)</option>
                  <option value="mov">MOV QuickTime (.mov)</option>
                </select>
              </div>

              {/* Primary Download Video Button */}
              <button
                type="button"
                onClick={handleDownloadVideo}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] text-white font-black text-xs shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Download Video (swapped_vocal_output.{exportFormat})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>Preset Output: swapped_vocal_output.{exportFormat}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
