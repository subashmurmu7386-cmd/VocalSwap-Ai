import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Film, 
  Settings2, 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  Sliders, 
  ShieldCheck, 
  Loader2, 
  Layers, 
  Info,
  Maximize2,
  FileVideo
} from 'lucide-react';
import { ExportFormat, ExportQuality } from '../types';
import { exportVideoWithPreset } from '../utils/ffmpegClient';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSource: File | Blob | string | null;
  audioSource: File | Blob | string | null;
  voiceName: string;
  originalFileName: string;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  videoSource,
  audioSource,
  voiceName,
  originalFileName,
  onShowToast,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('mp4');
  const [selectedQuality, setSelectedQuality] = useState<ExportQuality>('original');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (!videoSource) {
      onShowToast('Missing Video Source', 'Please ensure a video is loaded before exporting.', 'error');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);
    setExportStatusText('Initializing FFmpeg WebAssembly Export Pipeline...');

    try {
      const sourceAudio = audioSource || videoSource;
      const result = await exportVideoWithPreset(
        videoSource,
        sourceAudio,
        selectedFormat,
        selectedQuality,
        (prog) => {
          setExportProgress(Math.max(15, Math.min(95, prog)));
          if (prog < 50) {
            setExportStatusText(`Encoding ${selectedFormat.toUpperCase()} video frames (${selectedQuality})...`);
          } else {
            setExportStatusText('Muxing 320kbps master audio track into container...');
          }
        },
        (msg, type) => {
          // Log updates
        }
      );

      setExportProgress(100);
      setExportStatusText('Export complete! Initiating download...');

      // Trigger instant download
      const cleanBaseName = originalFileName.replace(/\.[^/.]+$/, '');
      const downloadFilename = `${cleanBaseName}_VocalSwap_${voiceName.replace(/\s+/g, '_')}_${selectedQuality}.${selectedFormat}`;
      
      const a = document.createElement('a');
      a.href = result.exportUrl;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      onShowToast(
        'Export Successful!',
        `Saved ${downloadFilename} (${(result.exportBlob.size / (1024 * 1024)).toFixed(2)} MB)`,
        'success'
      );

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 900);
    } catch (err: unknown) {
      setIsExporting(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      onShowToast('Export Error', `Failed to transcode: ${errMsg}`, 'error');
    }
  };

  return (
    <div 
      id="modal-export-controller"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="relative w-full max-w-xl rounded-3xl glass-panel p-6 sm:p-8 border border-[#00f0ff]/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient glow sweep */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00f0ff] to-[#a855f7] p-[1px] shadow-lg shadow-[#00f0ff]/20">
              <div className="w-full h-full rounded-[15px] bg-slate-950/80 flex items-center justify-center">
                <FileVideo className="w-5 h-5 text-[#00f0ff]" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Export & Master Video</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30">
                  FFmpeg WASM
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Configure container format, resolution presets, and lossless encoding flags
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-6 space-y-6">
          {/* Format Options */}
          <div>
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-2.5">
              <Film className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Container Format</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { format: 'mp4' as ExportFormat, label: '.MP4 (H.264)', desc: 'Universal Compatibility' },
                { format: 'webm' as ExportFormat, label: '.WEBM (VP9)', desc: 'Web & Chrome Optimized' },
                { format: 'mov' as ExportFormat, label: '.MOV (Pro)', desc: 'Apple & Final Cut Pro' },
              ].map((item) => {
                const isSelected = selectedFormat === item.format;
                return (
                  <button
                    key={item.format}
                    type="button"
                    onClick={() => setSelectedFormat(item.format)}
                    disabled={isExporting}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-white shadow-lg shadow-[#00f0ff]/20 ring-1 ring-[#00f0ff]'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-black tracking-wide">{item.label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality Presets */}
          <div>
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-2.5">
              <Sliders className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Resolution & Quality Preset</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { quality: 'original' as ExportQuality, label: 'Original / Lossless', desc: 'Preserves native resolution' },
                { quality: '1080p' as ExportQuality, label: '1080p Full HD', desc: 'Lanczos scaled (CRF 18)' },
                { quality: '720p' as ExportQuality, label: '720p HD', desc: 'Lanczos scaled (CRF 20)' },
              ].map((item) => {
                const isSelected = selectedQuality === item.quality;
                return (
                  <button
                    key={item.quality}
                    type="button"
                    onClick={() => setSelectedQuality(item.quality)}
                    disabled={isExporting}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#a855f7]/20 border-[#a855f7] text-white shadow-lg shadow-[#a855f7]/20 ring-1 ring-[#a855f7]'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Encoding Guarantees & FFmpeg Flag Inspection */}
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aspect Ratio & Frame Integrity Guaranteed
              </span>
              <span className="font-mono text-slate-400 text-[10px]">No Cropping / No Stretching</span>
            </div>
            
            <div className="text-[10px] font-mono text-slate-400 flex flex-wrap gap-2 pt-1 border-t border-white/5">
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300">
                CRF: {selectedQuality === 'original' ? 'Lossless Stream Copy' : selectedQuality === '1080p' ? '18 (Pristine)' : '20 (HD)'}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-purple-300">
                Audio: 320 kbps Stereo AAC
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-300">
                Preset: Slow / High Fidelity
              </span>
            </div>
          </div>

          {/* Progress Bar during Export */}
          {isExporting && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-[#00f0ff]/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-[#00f0ff] animate-spin" />
                  {exportStatusText}
                </span>
                <span className="text-[#00f0ff] font-bold">{Math.round(exportProgress)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartExport}
            disabled={isExporting}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] hover:opacity-90 shadow-lg shadow-[#00f0ff]/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcoding...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export & Download {selectedFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
