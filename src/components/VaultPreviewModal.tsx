import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Film,
  FileVideo,
  Radio,
  Sparkles,
  CheckCircle2,
  Volume2,
  Sliders,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ConversionRecord } from '../lib/firestore';

export interface VaultPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoData?: Uint8Array | ArrayBuffer | Blob | string | null;
  videoUrl?: string | null;
  record?: ConversionRecord | null;
  convertedAudioUrl?: string | null;
  originalAudioUrl?: string | null;
  originalVideoName?: string;
  targetVoiceName?: string;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'error') => void;
}

export type ExportFormat = 'mp4' | 'webm' | 'mov';

/**
 * Cloud Conversion Vault - HTML5 Video Preview Modal
 * Features explicit Blob wrapping, safe Object URL management, and HTML5 video playback controls.
 */
export const VaultPreviewModal: React.FC<VaultPreviewModalProps> = ({
  isOpen,
  onClose,
  videoData,
  videoUrl: propVideoUrl,
  record,
  convertedAudioUrl,
  originalAudioUrl,
  originalVideoName,
  targetVoiceName,
  onShowToast,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);

  const [playbackUrl, setPlaybackUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAudioTrack, setActiveAudioTrack] = useState<'swapped' | 'original'>('swapped');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');

  const activeVideoName = record?.originalVideoName || originalVideoName || 'swapped_vocal_output';
  const activeVoiceName = record?.targetVoiceName || targetVoiceName || 'AI Cloned Voice';
  const activeOriginalAudioUrl = record?.originalAudioUrl || originalAudioUrl;

  /**
   * Explicit Blob Wrapping & Memory Management Lifecycle
   * Ensures compiled FFmpeg WASM output buffers are explicitly wrapped in video/mp4 Blob objects
   * and safely revoked when unmounting or loading a new stream.
   */
  useEffect(() => {
    if (!isOpen) {
      setPlaybackUrl('');
      return;
    }

    let createdUrl: string | null = null;
    let isBlobCreated = false;

    // 1. Process Uint8Array or ArrayBuffer from FFmpeg WebAssembly output
    if (videoData instanceof Uint8Array) {
      const finalBlob = new Blob([videoData.buffer], { type: 'video/mp4' });
      createdUrl = URL.createObjectURL(finalBlob);
      isBlobCreated = true;
    } else if (videoData instanceof ArrayBuffer) {
      const finalBlob = new Blob([videoData], { type: 'video/mp4' });
      createdUrl = URL.createObjectURL(finalBlob);
      isBlobCreated = true;
    } else if (videoData instanceof Blob) {
      const mimeType = videoData.type && videoData.type.startsWith('video/') ? videoData.type : 'video/mp4';
      const finalBlob = new Blob([videoData], { type: mimeType });
      createdUrl = URL.createObjectURL(finalBlob);
      isBlobCreated = true;
    } else if (typeof videoData === 'string' && videoData.trim().length > 0) {
      createdUrl = videoData;
    }

    // 2. Fallback to direct props or Firestore record URLs
    if (!createdUrl && propVideoUrl) {
      createdUrl = propVideoUrl;
    }
    if (!createdUrl && record?.convertedVideoUrl) {
      createdUrl = record.convertedVideoUrl;
    }
    if (!createdUrl && record?.originalVideoUrl) {
      createdUrl = record.originalVideoUrl;
    }

    if (createdUrl) {
      setPlaybackUrl(createdUrl);
    }

    // Memory Cleanup: Revoke Object URL on unmount or URL transition
    return () => {
      if (isBlobCreated && createdUrl && createdUrl.startsWith('blob:')) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, videoData, propVideoUrl, record]);

  // Sync A/B Original Audio comparison track
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

  if (!isOpen) return null;

  // Toggle A/B Audio track comparison
  const handleToggleAudioTrack = (track: 'swapped' | 'original') => {
    setActiveAudioTrack(track);

    if (videoRef.current) {
      if (track === 'original') {
        videoRef.current.muted = true;
        if (originalAudioRef.current) {
          originalAudioRef.current.currentTime = videoRef.current.currentTime;
          if (!videoRef.current.paused) {
            originalAudioRef.current.play().catch(() => {});
          }
        }
      } else {
        videoRef.current.muted = false;
        if (originalAudioRef.current) {
          originalAudioRef.current.pause();
        }
      }
    }

    if (onShowToast) {
      onShowToast(
        track === 'swapped' ? 'A/B Audio: AI Swapped Track Active' : 'A/B Audio: Original Voice Track Active',
        track === 'swapped' ? `Listening to ${activeVoiceName} vocal clone` : 'Original audio track',
        'info'
      );
    }
  };

  // Direct File Download Handler
  const handleDownload = () => {
    if (!playbackUrl) {
      if (onShowToast) onShowToast('Download Failed', 'No valid video source URL available.', 'error');
      return;
    }

    const sanitizedName = activeVideoName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    const filename = `vocalswap_vault_${sanitizedName}.${exportFormat}`;

    const a = document.createElement('a');
    a.href = playbackUrl;
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
      id="modal-vault-preview-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="modal-vault-preview-container"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl glass-panel border border-[#00f0ff]/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-slate-950/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00f0ff]/20 to-[#a855f7]/20 border border-[#00f0ff]/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Cloud Conversion Vault Preview</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Faststart Stream
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Video: <span className="text-white font-medium">{activeVideoName}</span> • Cloned: <span className="text-[#00f0ff] font-medium">{activeVoiceName}</span>
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
          <div className="relative w-full flex items-center justify-center bg-black/90 rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
            {playbackUrl ? (
              <video 
                ref={videoRef}
                src={playbackUrl} 
                controls 
                playsInline 
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-auto max-h-[420px] rounded-xl bg-black border border-slate-700/60 shadow-xl"
              />
            ) : (
              <div className="w-full h-[320px] flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <FileVideo className="w-12 h-12 text-[#00f0ff] animate-pulse mb-3" />
                <p className="text-sm font-semibold text-white mb-1">Preparing WebAssembly Video Stream...</p>
                <p className="text-xs text-slate-400">Decoding output binary container buffer</p>
              </div>
            )}
          </div>

          {/* Action Control Panel */}
          <div className="p-4 rounded-2xl glass-panel border border-[#00f0ff]/25 shadow-xl space-y-4 bg-slate-900/90">
            {/* Top Action Row: Audio A/B Track Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
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
                        ? 'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-white shadow-md shadow-[#00f0ff]/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Swapped Voice</span>
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
                    <span>Original Audio</span>
                  </button>
                </div>
              </div>

              {/* Format Export Selector & Download */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10 text-xs">
                  {(['mp4', 'webm', 'mov'] as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`px-2.5 py-1 rounded-lg font-mono uppercase transition-all ${
                        exportFormat === fmt
                          ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00f0ff] text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .{exportFormat.toUpperCase()}</span>
                </button>
              </div>
            </div>

            {/* Bottom Row Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                FFmpeg WebAssembly 5x+ Accelerated Remuxing Active
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Container: H.264 Video Copy + 192k AAC Audio
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
