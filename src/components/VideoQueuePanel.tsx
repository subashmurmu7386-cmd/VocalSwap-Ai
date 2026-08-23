import React, { useRef } from 'react';
import { 
  ListVideo, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Play, 
  Layers,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { QueueItem, VideoFileState } from '../types';
import { formatTime } from '../utils/audioUtils';

interface VideoQueuePanelProps {
  queue: QueueItem[];
  activeQueueId: string | null;
  isProcessing: boolean;
  onSelectActiveQueueItem: (id: string) => void;
  onAddVideosToQueue: (videos: VideoFileState[]) => void;
  onRemoveQueueItem: (id: string) => void;
  onClearCompletedQueue: () => void;
  onStartQueueProcessing: () => void;
  onOpenBatchOverview?: () => void;
}

export const VideoQueuePanel: React.FC<VideoQueuePanelProps> = ({
  queue,
  activeQueueId,
  isProcessing,
  onSelectActiveQueueItem,
  onAddVideosToQueue,
  onRemoveQueueItem,
  onClearCompletedQueue,
  onStartQueueProcessing,
  onOpenBatchOverview,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((f) => f.type.startsWith('video/'));
    if (validFiles.length === 0) {
      alert('Please upload valid video files (.mp4, .mov, .webm)');
      return;
    }

    const newVideoStates: VideoFileState[] = [];
    let loadedCount = 0;

    validFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        newVideoStates.push({
          file,
          url,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          duration: tempVideo.duration || 15,
          dimensions: {
            width: tempVideo.videoWidth || 1920,
            height: tempVideo.videoHeight || 1080,
          },
          originalAudioTrack: 'Original Embedded Audio Track (Stereo 48kHz)',
          isSample: false,
        });

        loadedCount++;
        if (loadedCount === validFiles.length) {
          onAddVideosToQueue(newVideoStates);
        }
      };
    });
  };

  if (queue.length === 0) return null;

  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const queuedCount = queue.filter((q) => q.status === 'queued').length;
  const processingCount = queue.filter((q) => q.status === 'processing').length;
  const overallProgress =
    queue.length > 0
      ? Math.round(
          (queue.reduce((acc, item) => {
            if (item.status === 'completed') return acc + 100;
            if (item.status === 'processing') return acc + item.progress;
            return acc;
          }, 0) /
            (queue.length * 100)) *
            100
        )
      : 0;

  return (
    <div 
      id="panel-video-queue"
      className="mt-6 p-5 sm:p-6 rounded-3xl glass-panel border border-[#00f0ff]/30 shadow-2xl space-y-4"
    >
      {/* Hidden file input for adding multiple videos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => handleFileInput(e.target.files)}
      />

      {/* Queue Header & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#00f0ff]">
            <ListVideo className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Batch Video Queue</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30">
                {queue.length} {queue.length === 1 ? 'Video' : 'Videos'} in Queue
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              Selected voice & conversion settings will apply automatically across all queued videos
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenBatchOverview && (
            <button
              type="button"
              onClick={onOpenBatchOverview}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BarChart2 className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Batch Overview</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Videos</span>
          </button>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={onClearCompletedQueue}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 text-xs font-medium transition-colors"
            >
              Clear Completed ({completedCount})
            </button>
          )}

          {queuedCount > 0 && !isProcessing && (
            <button
              type="button"
              onClick={onStartQueueProcessing}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-purple-600 hover:from-[#00f0ff]/90 hover:to-purple-600/90 text-white text-xs font-bold shadow-lg shadow-[#00f0ff]/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Process Queue ({queuedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Progress Bar */}
      {isProcessing && (
        <div className="space-y-1.5 p-3 rounded-2xl bg-black/50 border border-white/10">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-cyan-300 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
              Processing Batch: {completedCount + processingCount} of {queue.length}
            </span>
            <span className="text-white font-bold">{overallProgress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-950 p-0.5 border border-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] transition-all duration-300"
              style={{ width: `${Math.max(3, overallProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Items Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {queue.map((item, index) => {
          const isActive = item.id === activeQueueId;
          const isCompleted = item.status === 'completed';
          const isItemProcessing = item.status === 'processing';
          const isFailed = item.status === 'failed';

          return (
            <div
              key={item.id}
              onClick={() => onSelectActiveQueueItem(item.id)}
              className={`relative p-3.5 rounded-2xl transition-all cursor-pointer border flex flex-col justify-between space-y-2.5 ${
                isActive
                  ? 'bg-[#00f0ff]/10 border-[#00f0ff] shadow-lg shadow-[#00f0ff]/10 ring-1 ring-[#00f0ff]/50'
                  : 'bg-black/40 hover:bg-black/60 border-white/10 hover:border-white/20'
              }`}
            >
              {/* Item Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-white/10 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                    #{index + 1}
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[130px]" title={item.videoState.name}>
                    {item.videoState.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Status Badge */}
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                  {isItemProcessing && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      <Loader2 className="w-3 h-3 animate-spin" /> {Math.round(item.progress)}%
                    </span>
                  )}
                  {isFailed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      <AlertCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                  {item.status === 'queued' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      <Clock className="w-3 h-3" /> Queued
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveQueueItem(item.id);
                    }}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Video Specs & Duration */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{formatTime(item.videoState.duration)}</span>
                <span>{item.videoState.size}</span>
              </div>

              {/* Item Progress Bar if actively processing */}
              {isItemProcessing && (
                <div className="h-1.5 w-full rounded-full bg-slate-900 p-0.5 border border-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00f0ff] transition-all duration-300"
                    style={{ width: `${Math.max(5, item.progress)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
