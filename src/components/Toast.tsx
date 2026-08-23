import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-2xl glass-panel shadow-2xl border transition-all duration-300 flex items-start gap-3 animate-in slide-in-from-bottom-4 ${
            t.type === 'success'
              ? 'border-emerald-500/40 bg-slate-900/90 shadow-emerald-500/10'
              : t.type === 'error'
              ? 'border-red-500/40 bg-slate-900/90 shadow-red-500/10'
              : 'border-[#00f0ff]/40 bg-slate-900/90 shadow-[#00f0ff]/10'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : t.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-[#00f0ff] flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-white">{t.title}</h5>
            {t.description && (
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{t.description}</p>
            )}
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
