import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Sparkles, 
  Check, 
  Copy, 
  RefreshCw, 
  Volume2, 
  AlignLeft,
  Clock
} from 'lucide-react';
import { GeminiAudioAnalysis, SpeakerSegment, WordTimestamp } from '../types';
import { generateSrtContent, formatSrtTime } from '../lib/gemini';

interface TranscriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiAnalysis: GeminiAudioAnalysis | null;
  onSaveAndResynthesize?: (updatedTranscript: string, updatedSpeakers?: SpeakerSegment[]) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const TranscriptEditorModal: React.FC<TranscriptEditorModalProps> = ({
  isOpen,
  onClose,
  geminiAnalysis,
  onSaveAndResynthesize,
  onShowToast,
}) => {
  const [editedTranscript, setEditedTranscript] = useState<string>('');
  const [editedSpeakers, setEditedSpeakers] = useState<SpeakerSegment[]>([]);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [copiedSrt, setCopiedSrt] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && geminiAnalysis) {
      setEditedTranscript(geminiAnalysis.transcript || '');
      setEditedSpeakers(geminiAnalysis.speakers ? [...geminiAnalysis.speakers] : []);
    }
  }, [isOpen, geminiAnalysis]);

  if (!isOpen) return null;

  const currentSrt = generateSrtContent(
    geminiAnalysis?.wordTimestamps || [],
    editedSpeakers.length > 0 ? editedSpeakers : undefined
  );

  const handleSpeakerTextChange = (index: number, newText: string) => {
    const updated = [...editedSpeakers];
    updated[index] = { ...updated[index], text: newText };
    setEditedSpeakers(updated);

    // Also update full transcript
    const fullText = updated.map((s) => s.text).join(' ');
    setEditedTranscript(fullText);
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(editedTranscript);
    setCopiedTranscript(true);
    onShowToast('Transcript Copied!', 'Text copied to clipboard.', 'success');
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleDownloadSrt = () => {
    const blob = new Blob([currentSrt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VocalSwap_Subtitles_${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Subtitles Downloaded', 'Saved .srt subtitle file.', 'success');
  };

  const handleDownloadVtt = () => {
    // Convert SRT to WebVTT format
    const vttContent = `WEBVTT\n\n${currentSrt.replace(/,/g, '.')}`;
    const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VocalSwap_Subtitles_${Date.now()}.vtt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('WebVTT Downloaded', 'Saved .vtt subtitle file.', 'success');
  };

  const handleApplyResynthesis = () => {
    if (onSaveAndResynthesize) {
      onSaveAndResynthesize(editedTranscript, editedSpeakers);
      onShowToast('Script Updated', 'Re-synthesizing voice with modified script text...', 'info');
      onClose();
    }
  };

  return (
    <div 
      id="modal-transcript-editor"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="relative w-full max-w-3xl rounded-3xl glass-panel p-6 sm:p-8 border border-[#00f0ff]/40 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient glow line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00f0ff] to-purple-500 p-[1px] shadow-lg shadow-[#00f0ff]/20">
              <div className="w-full h-full rounded-[15px] bg-slate-950/80 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#00f0ff]" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Transcript & Subtitle Script Editor</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30">
                  Interactive
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Edit spoken words before vocal synthesis and download synchronized .srt / .vtt subtitles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="mt-6 space-y-6 overflow-y-auto pr-1 flex-1">
          {/* Speaker Segments Breakdown (if available) */}
          {editedSpeakers.length > 0 ? (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <AlignLeft className="w-4 h-4 text-[#00f0ff]" />
                <span>Spoken Dialogue by Speaker Segment</span>
              </label>

              <div className="space-y-3">
                {editedSpeakers.map((speaker, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#00f0ff]">
                        {speaker.speakerName || speaker.speakerId}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {speaker.start.toFixed(1)}s - {speaker.end.toFixed(1)}s
                      </span>
                    </div>

                    <textarea
                      rows={2}
                      value={speaker.text}
                      onChange={(e) => handleSpeakerTextChange(idx, e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-[#00f0ff]/50 font-sans"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Standard Full Transcript Text Area */
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span>Full Spoken Script Transcript</span>
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="text-xs text-[#00f0ff] hover:text-white flex items-center gap-1"
                >
                  {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTranscript ? 'Copied' : 'Copy Text'}</span>
                </button>
              </label>

              <textarea
                rows={5}
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-[#00f0ff]/50 font-sans"
                placeholder="Enter or edit spoken transcript text..."
              />
            </div>
          )}

          {/* Subtitle File Exporters (.SRT / .VTT) */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Synchronized Subtitles (.SRT / .VTT)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSrt}
                  className="px-3 py-1.5 rounded-xl bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 text-[#00f0ff] border border-[#00f0ff]/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .SRT</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadVtt}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .VTT</span>
                </button>
              </div>
            </div>

            {/* Subtitle Code Preview Box */}
            <div className="p-3 rounded-xl bg-black/80 font-mono text-[11px] text-cyan-300 max-h-32 overflow-y-auto border border-white/5 whitespace-pre-wrap">
              {currentSrt}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          {onSaveAndResynthesize && (
            <button
              type="button"
              onClick={handleApplyResynthesis}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#00f0ff] to-purple-600 hover:from-[#00f0ff]/90 hover:to-purple-600/90 shadow-lg shadow-[#00f0ff]/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Apply & Re-synthesize Voice</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
