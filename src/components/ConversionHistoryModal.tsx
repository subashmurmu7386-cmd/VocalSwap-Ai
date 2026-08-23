import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Play,
  Download,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Film,
  Mic2,
  Share2,
  Volume2
} from 'lucide-react';
import { ConversionRecord, subscribeRecentConversions, deleteConversionRecord } from '../lib/firestore';
import { PreviewModal } from './PreviewModal';

interface ConversionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversion?: (record: ConversionRecord) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'error') => void;
}

export const ConversionHistoryModal: React.FC<ConversionHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectConversion,
  onShowToast,
}) => {
  const [records, setRecords] = useState<ConversionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewRecord, setPreviewRecord] = useState<ConversionRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribe = subscribeRecentConversions((data) => {
      setRecords(data);
      setLoading(false);
    }, 15);

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    const success = await deleteConversionRecord(id);
    setDeletingId(null);
    if (success) {
      onShowToast('Record Deleted', 'Conversion removed from Firestore history.', 'info');
      if (previewRecord?.id === id) {
        setPreviewRecord(null);
      }
    } else {
      onShowToast('Delete Failed', 'Could not delete document from database.', 'error');
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    if (ts.toDate) {
      return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    }
    if (typeof ts === 'string') {
      try {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
      } catch {
        return ts;
      }
    }
    return 'Recent';
  };

  return (
    <div
      id="modal-conversion-history-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="modal-conversion-history-container"
        className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl glass-panel border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00f0ff]/20 to-[#a855f7]/20 border border-[#00f0ff]/30 flex items-center justify-center">
              <History className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Cloud Conversion Vault
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                  Firestore Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Persistent history & cloud stored video assets under Spark Free Tier
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

        {/* Modal Content / Conversion Vault List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#00f0ff]" />
              <p className="text-sm">Synchronizing with Firestore database...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Film className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Conversions Yet</h3>
              <p className="text-sm text-slate-400 max-w-md">
                Your voice-swapped video sessions will automatically be synchronized and persisted to Firebase Firestore here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl transition-all border ${
                    previewRecord?.id === rec.id
                      ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 shadow-lg'
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                        <span className="truncate">{rec.originalVideoName || 'Video Session'}</span>
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Mic2 className="w-3 h-3 text-[#a855f7]" />
                        <span>Cloned: {rec.targetVoiceName || 'Custom Voice'}</span>
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {rec.status === 'completed' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      ) : rec.status === 'processing' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing
                        </span>
                      ) : rec.status === 'uploading' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Uploading
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTimestamp(rec.createdAt)}
                    </span>
                    {rec.duration && (
                      <span>{Math.round(rec.duration)}s video</span>
                    )}
                    {rec.modelUsed && (
                      <span className="text-slate-500 truncate max-w-[120px]" title={rec.modelUsed}>
                        {rec.modelUsed}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      {(rec.convertedVideoUrl || rec.originalVideoUrl) && (
                        <button
                          onClick={() => setPreviewRecord(rec)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30 transition-all shadow-md"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Watch Output</span>
                        </button>
                      )}

                      {rec.convertedVideoUrl && (
                        <a
                          href={rec.convertedVideoUrl}
                          download={`swapped_vocal_output_${rec.id}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Download className="w-3 h-3" />
                          <span>Direct MP4</span>
                        </a>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleDelete(rec.id, e)}
                      disabled={deletingId === rec.id}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full Interactive Preview Modal */}
        <PreviewModal
          isOpen={Boolean(previewRecord)}
          onClose={() => setPreviewRecord(null)}
          record={previewRecord}
          onShowToast={onShowToast}
        />

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Total Saved Swaps: {records.length}</span>
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
