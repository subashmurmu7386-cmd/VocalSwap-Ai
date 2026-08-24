import React, { useState, useEffect } from 'react';
import { 
  X, 
  BarChart2, 
  Clock, 
  Pause, 
  Play, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Layers, 
  Sparkles,
  Plus,
  Activity,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { QueueItem } from '../types';
import { formatTime } from '../utils/audioUtils';

const CustomChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-slate-950/95 border border-[#00f0ff]/40 rounded-2xl shadow-2xl backdrop-blur-md font-sans text-xs space-y-1 z-50">
        <p className="font-bold text-white max-w-[220px] truncate">{data.fullName}</p>
        <div className="text-[11px] space-y-0.5 font-mono">
          <p className="text-[#00f0ff] flex items-center justify-between gap-3">
            <span>Processing Speed:</span>
            <span className="font-bold">{data.speed}x Realtime</span>
          </p>
          <p className="text-purple-300 flex items-center justify-between gap-3">
            <span>Video Duration:</span>
            <span className="font-bold">{data.duration}s</span>
          </p>
          <p className="text-pink-300 flex items-center justify-between gap-3">
            <span>Proc. Time:</span>
            <span className="font-bold">{data.procTime}s</span>
          </p>
          <p className="text-slate-400 capitalize flex items-center justify-between gap-3">
            <span>Status:</span>
            <span className="text-emerald-400 font-semibold">{data.status}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface BatchProgressOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueItem[];
  activeQueueId: string | null;
  isProcessing: boolean;
  isBatchPaused: boolean;
  onTogglePauseBatch: () => void;
  onTogglePauseItem: (id: string) => void;
  onMoveQueueItem: (id: string, direction: 'up' | 'down') => void;
  onRemoveQueueItem: (id: string) => void;
  onClearCompleted: () => void;
  onAddVideos: () => void;
  onStartQueueProcessing: () => void;
}

export const BatchProgressOverviewModal: React.FC<BatchProgressOverviewModalProps> = ({
  isOpen,
  onClose,
  queue,
  activeQueueId,
  isProcessing,
  isBatchPaused,
  onTogglePauseBatch,
  onTogglePauseItem,
  onMoveQueueItem,
  onRemoveQueueItem,
  onClearCompleted,
  onAddVideos,
  onStartQueueProcessing,
}) => {
  const [now, setNow] = useState<number>(Date.now());

  // Real-time ticking interval for live countdown while batch is processing
  useEffect(() => {
    if (!isOpen || !isProcessing || isBatchPaused) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, [isOpen, isProcessing, isBatchPaused]);

  if (!isOpen) return null;

  // Counters
  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const processingCount = queue.filter((q) => q.status === 'processing').length;
  const queuedCount = queue.filter((q) => q.status === 'queued').length;
  const pausedCount = queue.filter((q) => q.status === 'paused').length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;

  // Calculate global progress
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

  // Helper to extract actual processing time for a completed job
  const getJobProcTime = (item: QueueItem): number => {
    if (item.processingTimeSec && item.processingTimeSec > 0) {
      return item.processingTimeSec;
    }
    if (item.completedAt && item.startedAt) {
      const diff = (new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()) / 1000;
      if (diff > 0) return diff;
    }
    if (item.completedAt && item.createdAt) {
      const diff = (new Date(item.completedAt).getTime() - new Date(item.createdAt).getTime()) / 1000;
      if (diff > 0 && diff < 600) return diff;
    }
    const dur = item.videoState.duration || 10;
    return dur / 5.5;
  };

  // Completed Jobs in the current session
  const completedJobs = queue.filter((q) => q.status === 'completed');
  const completedJobsCount = completedJobs.length;

  // Sum processing times & video durations for completed jobs in current session
  const totalCompletedProcTime = completedJobs.reduce((acc, q) => acc + getJobProcTime(q), 0);
  const totalCompletedVideoDuration = completedJobs.reduce((acc, q) => acc + (q.videoState.duration || 10), 0);

  // Session Average Processing Metrics
  const avgProcTimePerJob = completedJobsCount > 0 ? totalCompletedProcTime / completedJobsCount : 0;
  
  // Ratio of conversion time per video duration second (e.g. 0.18 means 1.8s processing per 10s video = ~5.5x speed)
  const sessionSecPerVidSec =
    totalCompletedVideoDuration > 0
      ? totalCompletedProcTime / totalCompletedVideoDuration
      : 0.18; // Default baseline ~5.55x processing speed with FFmpeg stream-copy & hardware concurrency

  const sessionSpeedMultiplier = sessionSecPerVidSec > 0 ? 1 / sessionSecPerVidSec : 5.55;

  // Real-time Estimated Time Remaining (ETA) calculation
  const totalRemainingSec = queue.reduce((acc, item) => {
    if (item.status === 'completed' || item.status === 'failed') {
      return acc;
    }

    const dur = item.videoState.duration || 10;

    if (item.status === 'processing') {
      // If we have live start time and progress, combine elapsed calculation with session average
      if (item.startedAt && item.progress > 5) {
        const elapsedSec = Math.max(0.2, (now - new Date(item.startedAt).getTime()) / 1000);
        const extrapolatedTotal = elapsedSec / (Math.max(1, item.progress) / 100);
        const remainingByProgress = Math.max(0, extrapolatedTotal - elapsedSec);

        // If session history exists, blend session expectation with live progress speed
        if (completedJobsCount > 0) {
          const remainingPct = Math.max(0, 100 - item.progress) / 100;
          const expectedRemainingBySession = dur * sessionSecPerVidSec * remainingPct;
          return acc + (remainingByProgress * 0.7 + expectedRemainingBySession * 0.3);
        }
        return acc + remainingByProgress;
      } else {
        const remainingPct = Math.max(0, 100 - item.progress) / 100;
        return acc + dur * sessionSecPerVidSec * remainingPct;
      }
    }

    if (item.status === 'queued' || item.status === 'paused') {
      return acc + dur * sessionSecPerVidSec;
    }

    return acc;
  }, 0);

  // Recharts Processing Speed Data per video
  const chartData = queue.map((item, index) => {
    const dur = item.videoState.duration || 10;
    let procTime = 0;
    let speed = 1.0;

    if (item.status === 'completed') {
      procTime = Number(getJobProcTime(item).toFixed(1));
      speed = procTime > 0 ? Number((dur / procTime).toFixed(2)) : 1.5;
    } else if (item.status === 'processing') {
      if (item.startedAt && item.progress > 5) {
        const elapsedSec = Math.max(0.2, (now - new Date(item.startedAt).getTime()) / 1000);
        const extrapolatedTotal = elapsedSec / (item.progress / 100);
        procTime = Number(extrapolatedTotal.toFixed(1));
        speed = procTime > 0 ? Number((dur / procTime).toFixed(2)) : Number(sessionSpeedMultiplier.toFixed(2));
      } else {
        procTime = Number((dur * sessionSecPerVidSec).toFixed(1));
        speed = Number(sessionSpeedMultiplier.toFixed(2));
      }
    } else {
      // queued or paused
      procTime = Number((dur * sessionSecPerVidSec).toFixed(1));
      speed = Number(sessionSpeedMultiplier.toFixed(2));
    }

    return {
      id: item.id,
      index: index + 1,
      name:
        item.videoState.name.length > 12
          ? `${item.videoState.name.substring(0, 10)}...`
          : item.videoState.name,
      fullName: item.videoState.name,
      speed,
      duration: dur,
      procTime,
      status: item.status,
    };
  });

  const avgSpeed =
    chartData.length > 0
      ? (chartData.reduce((acc, d) => acc + d.speed, 0) / chartData.length).toFixed(2)
      : '0.00';

  const maxSpeed =
    chartData.length > 0
      ? Math.max(...chartData.map((d) => d.speed)).toFixed(2)
      : '0.00';

  const formatEta = (seconds: number) => {
    if (seconds <= 0 || completedCount === queue.length) return 'Complete';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);

    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl glass-panel border border-[#00f0ff]/30 shadow-2xl bg-slate-950/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00f0ff]/20 border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff] shadow-lg shadow-[#00f0ff]/10">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Batch Progress Overview</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 font-semibold">
                  {queue.length} {queue.length === 1 ? 'Job' : 'Jobs'} Total
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Monitor global pipeline progress, real-time estimated ETA, and adjust pending job priority
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-slate-400">Total Progress</span>
              <span className="text-2xl font-black text-[#00f0ff] font-mono mt-1">{overallProgress}%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400 animate-pulse" /> Estimated Time (ETA)
              </span>
              <div>
                <span className="text-2xl font-black text-white font-mono block mt-1">
                  {completedCount === queue.length && queue.length > 0
                    ? 'Complete'
                    : isProcessing && !isBatchPaused
                    ? formatEta(totalRemainingSec)
                    : isBatchPaused
                    ? 'Paused'
                    : queue.length > 0
                    ? formatEta(totalRemainingSec)
                    : 'Ready'}
                </span>
                <span className="text-[10px] font-mono text-cyan-300/90 block mt-0.5 truncate">
                  {completedJobsCount > 0
                    ? `Avg ${avgProcTimePerJob.toFixed(1)}s/job (${sessionSpeedMultiplier.toFixed(2)}x speed)`
                    : 'Baseline estimation'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-slate-400">Completed Jobs</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {completedCount} / {queue.length}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-slate-400">Status Breakdown</span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono font-bold">
                {processingCount > 0 && <span className="text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded">{processingCount} Active</span>}
                {queuedCount > 0 && <span className="text-slate-300 bg-white/10 px-1.5 py-0.5 rounded">{queuedCount} Queued</span>}
                {pausedCount > 0 && <span className="text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">{pausedCount} Paused</span>}
                {failedCount > 0 && <span className="text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">{failedCount} Error</span>}
              </div>
            </div>
          </div>

          {/* Global Batch Progress Bar */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold flex items-center gap-2">
                {isProcessing ? (
                  isBatchPaused ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                      <span>Batch Processing Paused</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
                      <span>Processing Batch Stream...</span>
                    </>
                  )
                ) : (
                  <span>Batch Pipeline Idle</span>
                )}
              </span>
              <span className="text-[#00f0ff] font-bold">{overallProgress}%</span>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-900 p-0.5 border border-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ec4899] transition-all duration-300 shadow-lg shadow-[#00f0ff]/20"
                style={{ width: `${Math.max(2, overallProgress)}%` }}
              />
            </div>
          </div>

          {/* Processing Speed Chart Section (Recharts) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00f0ff]" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Batch Processing Speed (x Realtime) Over Time
                </h3>
              </div>

              <div className="flex items-center gap-3 font-mono text-[11px]">
                <div className="flex items-center gap-1 text-slate-300">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>Avg Speed: <strong className="text-[#00f0ff]">{avgSpeed}x</strong></span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <span>Peak: <strong className="text-purple-400">{maxSpeed}x</strong></span>
                </div>
              </div>
            </div>

            <div className="h-48 sm:h-56 w-full pt-2">
              {queue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: '#ffffff20' }}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: '#ffffff20' }}
                      unit="x"
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={(value) => <span className="text-slate-300 font-mono">{value}</span>}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="speed" 
                      name="Speed Multiplier (x Realtime)" 
                      stroke="#00f0ff" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#speedGradient)" 
                    />
                    <Bar 
                      dataKey="procTime" 
                      name="Conversion Time (sec)" 
                      fill="url(#barGradient)" 
                      radius={[6, 6, 0, 0]}
                      barSize={18}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                  No video items in queue to graph
                </div>
              )}
            </div>
          </div>

          {/* Table Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00f0ff]" />
              <span>Job Queue Order & Control</span>
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onAddVideos}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              >
                <Plus className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Add Videos</span>
              </button>

              {isProcessing && (
                <button
                  type="button"
                  onClick={onTogglePauseBatch}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isBatchPaused
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  }`}
                >
                  {isBatchPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Batch</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Batch</span>
                    </>
                  )}
                </button>
              )}

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={onClearCompleted}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 text-xs transition-colors"
                >
                  Clear Finished ({completedCount})
                </button>
              )}

              {!isProcessing && (queuedCount > 0 || pausedCount > 0) && (
                <button
                  type="button"
                  onClick={onStartQueueProcessing}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-purple-600 hover:from-[#00f0ff]/90 hover:to-purple-600/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#00f0ff]/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Processing</span>
                </button>
              )}
            </div>
          </div>

          {/* Queue Tabular View */}
          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-mono text-[11px]">
                    <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                    <th className="py-3 px-4 font-semibold">Video File</th>
                    <th className="py-3 px-4 font-semibold">Specs & Duration</th>
                    <th className="py-3 px-4 font-semibold">Status & Progress</th>
                    <th className="py-3 px-4 font-semibold text-right">Queue Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {queue.map((item, index) => {
                    const isCurrentActive = item.id === activeQueueId;
                    const canMoveUp = index > 0 && (item.status === 'queued' || item.status === 'paused');
                    const canMoveDown = index < queue.length - 1 && (item.status === 'queued' || item.status === 'paused');

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-white/5 ${
                          isCurrentActive ? 'bg-[#00f0ff]/10' : ''
                        }`}
                      >
                        {/* Position Index */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                          {index + 1}
                        </td>

                        {/* File Info */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-xs truncate max-w-[200px]" title={item.videoState.name}>
                              {item.videoState.name}
                            </span>
                            {isCurrentActive && (
                              <span className="text-[10px] text-[#00f0ff] font-mono">Current Selection</span>
                            )}
                          </div>
                        </td>

                        {/* Specs & Duration */}
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          <div>{formatTime(item.videoState.duration)}</div>
                          <div className="text-[10px] text-slate-300">{item.videoState.size}</div>
                        </td>

                        {/* Status & Progress Bar */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {item.status === 'completed' && (
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Completed
                                </span>
                                {getJobProcTime(item) > 0 && (
                                  <span className="text-[10px] font-mono text-slate-400 pl-1">
                                    Done in {getJobProcTime(item).toFixed(1)}s ({(item.videoState.duration / getJobProcTime(item)).toFixed(1)}x speed)
                                  </span>
                                )}
                              </div>
                            )}
                            {item.status === 'processing' && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Processing {Math.round(item.progress)}%
                                </span>
                                <div className="h-1.5 w-32 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-[#00f0ff] transition-all duration-200"
                                    style={{ width: `${Math.max(5, item.progress)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {item.status === 'paused' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                <Pause className="w-3 h-3" /> Paused
                              </span>
                            )}
                            {item.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                                <AlertCircle className="w-3 h-3" /> Error
                              </span>
                            )}
                            {item.status === 'queued' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                                <Clock className="w-3 h-3" /> Queued
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Re-order & Item Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Re-order Up */}
                            <button
                              type="button"
                              disabled={!canMoveUp}
                              onClick={() => onMoveQueueItem(item.id, 'up')}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                canMoveUp
                                  ? 'bg-white/5 hover:bg-white/15 text-slate-300 border-white/10 cursor-pointer'
                                  : 'bg-transparent text-slate-700 border-transparent cursor-not-allowed'
                              }`}
                              title="Move Job Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Re-order Down */}
                            <button
                              type="button"
                              disabled={!canMoveDown}
                              onClick={() => onMoveQueueItem(item.id, 'down')}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                canMoveDown
                                  ? 'bg-white/5 hover:bg-white/15 text-slate-300 border-white/10 cursor-pointer'
                                  : 'bg-transparent text-slate-700 border-transparent cursor-not-allowed'
                              }`}
                              title="Move Job Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Pause / Resume specific pending job */}
                            {(item.status === 'queued' || item.status === 'paused') && (
                              <button
                                type="button"
                                onClick={() => onTogglePauseItem(item.id)}
                                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                  item.status === 'paused'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                }`}
                                title={item.status === 'paused' ? 'Resume Job' : 'Pause Job'}
                              >
                                {item.status === 'paused' ? (
                                  <Play className="w-3.5 h-3.5" />
                                ) : (
                                  <Pause className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Remove Item */}
                            <button
                              type="button"
                              onClick={() => onRemoveQueueItem(item.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                              title="Remove Job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/5 text-xs text-slate-400">
          <span className="font-mono">
            {completedCount} of {queue.length} jobs finished
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
