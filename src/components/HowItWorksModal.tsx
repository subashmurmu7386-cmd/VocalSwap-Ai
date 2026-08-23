import React from 'react';
import { 
  X, 
  Layers, 
  Cpu, 
  Sparkles, 
  Volume2, 
  Video, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Workflow
} from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div 
        id="modal-how-it-works"
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl glass-panel border border-[#00f0ff]/30 shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-[#00f0ff]">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                How VocalSwap AI Operates
              </h3>
              <p className="text-xs text-slate-400">
                End-to-end zero-shot video vocal demuxing and synthesis architecture
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl glass-panel-subtle hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4 items-start p-4 rounded-2xl glass-panel-subtle border border-white/5">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#00f0ff]/20 border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff] font-mono font-bold text-sm">
              1
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-[#00f0ff]" />
                Neural Demuxing & Vocal Track Extraction
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                The uploaded MP4 video stream is split into frame visuals and audio tracks. Using neural stem separation (Demucs v4), speech frequencies are isolated with surgical precision while preserving musical soundtracks and Foley ambience.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 items-start p-4 rounded-2xl glass-panel-subtle border border-white/5">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#a855f7] font-mono font-bold text-sm">
              2
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#a855f7]" />
                Zero-Shot Timbre Embedding & Formant Conversion
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                A 512-dimensional vocal acoustic fingerprint is computed from your target voice sample. The original phonetic content and emotional cadences are re-synthesized using the target voice’s throat acoustics, resonant baritone/soprano contours, and vibrato.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 items-start p-4 rounded-2xl glass-panel-subtle border border-white/5">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#ec4899]/20 border border-[#ec4899]/40 flex items-center justify-center text-[#ec4899] font-mono font-bold text-sm">
              3
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ec4899]" />
                Lip Sync Temporal Realignment & 48kHz Mastering
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                The synthesized voice track is dynamically cross-correlated against video lip movements to guarantee zero audio-video drift. The output is mastered in 48,000 Hz broadcast stereo and remuxed into a high-bitrate MP4 container.
              </p>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Zero Data Storage Policy:</strong> All audio embeddings and uploaded media are processed ephemerally in volatile GPU VRAM and discarded immediately after generation.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex justify-end bg-black/40">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-[#00f0ff]/20"
          >
            Got It, Back to Studio
          </button>
        </div>
      </div>
    </div>
  );
};
