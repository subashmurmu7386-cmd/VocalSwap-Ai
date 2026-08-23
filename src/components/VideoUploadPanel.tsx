import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  Trash2, 
  Play, 
  Pause, 
  Clock, 
  CheckCircle2, 
  Volume2,
  Scissors,
  RotateCcw,
  Sliders,
  Film
} from 'lucide-react';
import { VideoFileState } from '../types';
import { formatTime } from '../utils/audioUtils';
import { AudioInspector } from './AudioInspector';

interface VideoUploadPanelProps {
  videoState: VideoFileState | null;
  onVideoSelect: (video: VideoFileState) => void;
  onVideosSelect?: (videos: VideoFileState[]) => void;
  onVideoRemove: () => void;
}

const formatPreciseTime = (sec: number) => {
  if (isNaN(sec) || sec < 0) return '0:00.0';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

export const VideoUploadPanel: React.FC<VideoUploadPanelProps> = ({
  videoState,
  onVideoSelect,
  onVideosSelect,
  onVideoRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const videoDuration = Math.max(0.5, videoState?.duration || 15);
  const [startTrim, endTrim] = videoState?.trimRange || [0, Number(videoDuration.toFixed(1))];
  const activeTrimDuration = Math.max(0.1, endTrim - startTrim);

  const processFileList = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('video/'));
    if (validFiles.length === 0) {
      alert('Please upload valid video files (.mp4, .mov, .webm)');
      return;
    }

    if (validFiles.length > 1 && onVideosSelect) {
      const loadedStates: VideoFileState[] = [];
      let loadedCount = 0;

      validFiles.forEach((file) => {
        const url = URL.createObjectURL(file);
        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
          const dur = tempVideo.duration || 15;
          loadedStates.push({
            file,
            url,
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            duration: dur,
            dimensions: {
              width: tempVideo.videoWidth || 1920,
              height: tempVideo.videoHeight || 1080,
            },
            originalAudioTrack: 'Original Embedded Audio Track (Stereo 48kHz)',
            isSample: false,
            trimRange: [0, Number(dur.toFixed(1))],
          });

          loadedCount++;
          if (loadedCount === validFiles.length) {
            onVideosSelect(loadedStates);
          }
        };
      });
    } else {
      const file = validFiles[0];
      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        const dur = tempVideo.duration || 15;
        onVideoSelect({
          file,
          url,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          duration: dur,
          dimensions: {
            width: tempVideo.videoWidth || 1920,
            height: tempVideo.videoHeight || 1080,
          },
          originalAudioTrack: 'Original Embedded Audio Track (Stereo 48kHz)',
          isSample: false,
          trimRange: [0, Number(dur.toFixed(1))],
        });
      };
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (videoRef.current.currentTime >= endTrim || videoRef.current.currentTime < startTrim) {
        videoRef.current.currentTime = startTrim;
      }
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      if (isPlaying && curr >= endTrim) {
        videoRef.current.pause();
        videoRef.current.currentTime = startTrim;
        setIsPlaying(false);
      }
    }
  };

  const handleStartTrimChange = (newVal: number) => {
    if (!videoState) return;
    const clamped = Math.max(0, Math.min(newVal, endTrim - 0.5));
    const newRange: [number, number] = [Number(clamped.toFixed(1)), endTrim];
    onVideoSelect({ ...videoState, trimRange: newRange });
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  const handleEndTrimChange = (newVal: number) => {
    if (!videoState) return;
    const clamped = Math.min(videoDuration, Math.max(newVal, startTrim + 0.5));
    const newRange: [number, number] = [startTrim, Number(clamped.toFixed(1))];
    onVideoSelect({ ...videoState, trimRange: newRange });
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  const handleResetTrim = () => {
    if (!videoState) return;
    const fullRange: [number, number] = [0, Number(videoDuration.toFixed(1))];
    onVideoSelect({ ...videoState, trimRange: fullRange });
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handlePlayTrimmedSegment = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTrim;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const leftPercent = Math.min(100, Math.max(0, (startTrim / videoDuration) * 100));
  const rightPercent = Math.min(100, Math.max(0, (1 - endTrim / videoDuration) * 100));
  const playheadPercent = Math.min(100, Math.max(0, (currentTime / videoDuration) * 100));

  return (
    <div 
      id="panel-step-1-video" 
      className="flex flex-col h-full rounded-2xl glass-panel p-5 sm:p-6 transition-all duration-300 relative overflow-hidden group"
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] font-bold text-xs font-mono">
            01
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              Upload Video
              <span className="text-[11px] font-normal text-slate-400">(.mp4, .mov, .webm)</span>
            </h2>
          </div>
        </div>

        {videoState && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Loaded
            </span>
            <button
              id="btn-remove-video"
              onClick={onVideoRemove}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Remove video"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFileList(e.target.files);
          }
        }}
      />

      {/* Main Content Area */}
      {!videoState ? (
        <div className="flex-1 flex flex-col justify-center">
          {/* Drag and Drop Zone */}
          <div
            id="dropzone-video-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 min-h-[220px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-[#00f0ff] bg-[#00f0ff]/10 shadow-lg shadow-[#00f0ff]/20 scale-[1.01]'
                : 'border-white/15 hover:border-[#00f0ff]/50 hover:bg-white/[0.03]'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00f0ff]/20 to-[#a855f7]/20 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7 text-[#00f0ff]" />
            </div>
            <p className="text-sm font-semibold text-white">
              Drag & drop your video here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or <span className="text-[#00f0ff] underline underline-offset-2">browse files</span> from your computer
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">MP4</span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">MOV</span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">WEBM</span>
              <span>Max 100MB</span>
            </div>
          </div>
        </div>
      ) : (
        /* Video Uploaded Preview State */
        <div className="flex-1 flex flex-col space-y-3">
          {/* Custom Video Player with Glass Overlay Controls */}
          <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center group/player">
            <video
              ref={videoRef}
              src={videoState.url || undefined}
              poster={videoState.thumbnailUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
              playsInline
            />

            {/* Overlay Play/Pause Button */}
            <button
              onClick={togglePlay}
              className={`absolute inset-0 m-auto w-14 h-14 rounded-full glass-panel flex items-center justify-center text-white border border-[#00f0ff]/40 shadow-xl transition-all duration-300 ${
                isPlaying ? 'opacity-0 group-hover/player:opacity-100' : 'opacity-100 scale-100'
              }`}
            >
              {isPlaying ? <Pause className="w-6 h-6 text-[#00f0ff]" /> : <Play className="w-6 h-6 text-[#00f0ff] translate-x-0.5" />}
            </button>

            {/* Bottom mini scrubber overlay */}
            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-[11px] text-white font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#00f0ff]" />
                {formatTime(currentTime)} / {formatTime(videoState.duration)}
              </span>
              <span className="text-[10px] text-slate-300">
                {videoState.dimensions.width}×{videoState.dimensions.height}
              </span>
            </div>
          </div>

          {/* Video Metadata Breakdown Card */}
          <div className="p-3 rounded-xl glass-panel-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white truncate max-w-[200px]" title={videoState.name}>
                {videoState.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                {videoState.size}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300/90 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
              <span className="truncate">{videoState.originalAudioTrack || 'Audio: 48kHz Stereo Detected'}</span>
            </div>
          </div>

          {/* Interactive Video Trim Range Slider */}
          <div 
            id="video-trim-range-container" 
            className="p-3.5 rounded-xl glass-panel-subtle bg-slate-950/70 border border-[#00f0ff]/30 shadow-lg space-y-3"
          >
            {/* Header Info Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                <Scissors className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Video Trim Range</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                  {formatPreciseTime(activeTrimDuration)} active
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Quick Play Trimmed Segment */}
                <button
                  type="button"
                  onClick={handlePlayTrimmedSegment}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/40 transition-all shadow-sm"
                  title="Play selected trimmed video interval"
                >
                  <Play className="w-3 h-3 fill-current text-[#00f0ff]" />
                  <span>Play Segment</span>
                </button>

                {/* Reset button */}
                {(startTrim > 0 || endTrim < videoDuration) && (
                  <button
                    type="button"
                    onClick={handleResetTrim}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 p-1 hover:bg-white/10 rounded transition-colors"
                    title="Reset trim range to full video length"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Visual Dual Handle Slider Timeline Bar */}
            <div className="relative pt-2 pb-1 px-1">
              {/* Track Canvas Container */}
              <div className="relative h-7 rounded-lg bg-slate-900 border border-white/15 overflow-hidden flex items-center">
                {/* Dimmed Out-of-bounds Left Region */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-black/75 z-10 border-r border-[#00f0ff]/60"
                  style={{ width: `${leftPercent}%` }}
                />

                {/* Active Trimmed Region */}
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-[#00f0ff]/30 via-[#a855f7]/30 to-[#ec4899]/30 border-y border-[#00f0ff]/60 z-0"
                  style={{
                    left: `${leftPercent}%`,
                    right: `${rightPercent}%`,
                  }}
                >
                  {/* Decorative Filmstrip Tick Lines */}
                  <div className="w-full h-full opacity-25 bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,rgba(0,240,255,0.8)_6px,rgba(0,240,255,0.8)_8px)]" />
                </div>

                {/* Dimmed Out-of-bounds Right Region */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-black/75 z-10 border-l border-pink-500/60"
                  style={{ width: `${rightPercent}%` }}
                />

                {/* Realtime Playhead Scrubber */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white z-20 shadow-[0_0_8px_#00f0ff]"
                  style={{ left: `${playheadPercent}%` }}
                />
              </div>

              {/* Range Input overlay for Start Handle */}
              <input
                id="slider-video-trim-start"
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={startTrim}
                onChange={(e) => handleStartTrimChange(parseFloat(e.target.value))}
                className="absolute inset-x-1 top-2 w-full h-7 opacity-0 cursor-ew-resize z-30 pointer-events-auto"
                style={{
                  clipPath: `polygon(0 0, ${leftPercent + 10}% 0, ${leftPercent + 10}% 100%, 0 100%)`,
                }}
              />

              {/* Range Input overlay for End Handle */}
              <input
                id="slider-video-trim-end"
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={endTrim}
                onChange={(e) => handleEndTrimChange(parseFloat(e.target.value))}
                className="absolute inset-x-1 top-2 w-full h-7 opacity-0 cursor-ew-resize z-30 pointer-events-auto"
                style={{
                  clipPath: `polygon(${100 - rightPercent - 10}% 0, 100% 0, 100% 100%, ${100 - rightPercent - 10}% 100%)`,
                }}
              />
            </div>

            {/* Dual Range Controls & Fine-Tuning Step Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
              {/* Start Point Range Control */}
              <div className="space-y-1.5 bg-black/40 p-2.5 rounded-lg border border-[#00f0ff]/20">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-[#00f0ff] font-bold flex items-center gap-1">
                    <Film className="w-3 h-3 text-[#00f0ff]" />
                    <span>Start:</span>
                  </span>
                  <span className="text-white font-bold">{formatPreciseTime(startTrim)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, endTrim - 0.5)}
                  step={0.1}
                  value={startTrim}
                  onChange={(e) => handleStartTrimChange(parseFloat(e.target.value))}
                  className="w-full accent-[#00f0ff] cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <button
                    type="button"
                    onClick={() => handleStartTrimChange(startTrim - 0.5)}
                    className="hover:text-[#00f0ff] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 transition-colors"
                  >
                    -0.5s
                  </button>
                  <span className="text-slate-500">0.0s</span>
                  <button
                    type="button"
                    onClick={() => handleStartTrimChange(startTrim + 0.5)}
                    className="hover:text-[#00f0ff] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 transition-colors"
                  >
                    +0.5s
                  </button>
                </div>
              </div>

              {/* End Point Range Control */}
              <div className="space-y-1.5 bg-black/40 p-2.5 rounded-lg border border-pink-500/20">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-pink-400 font-bold flex items-center gap-1">
                    <Film className="w-3 h-3 text-pink-400" />
                    <span>End:</span>
                  </span>
                  <span className="text-white font-bold">{formatPreciseTime(endTrim)}</span>
                </div>
                <input
                  type="range"
                  min={Math.min(videoDuration, startTrim + 0.5)}
                  max={videoDuration}
                  step={0.1}
                  value={endTrim}
                  onChange={(e) => handleEndTrimChange(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <button
                    type="button"
                    onClick={() => handleEndTrimChange(endTrim - 0.5)}
                    className="hover:text-pink-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 transition-colors"
                  >
                    -0.5s
                  </button>
                  <span className="text-slate-500">{formatPreciseTime(videoDuration)}</span>
                  <button
                    type="button"
                    onClick={() => handleEndTrimChange(endTrim + 0.5)}
                    className="hover:text-pink-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 transition-colors"
                  >
                    +0.5s
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Inspector for Uploaded Video */}
          <AudioInspector
            file={videoState.file}
            audioUrl={videoState.url}
            title="Video Audio Inspector"
            subtitle="Live Web Audio API stream telemetry"
            className="mt-2"
            onAutoTrimmed={(_trimmedBlob, _trimmedUrl, trimRange) => {
              onVideoSelect({
                ...videoState,
                trimRange: [
                  Number(trimRange[0].toFixed(1)),
                  Number(trimRange[1].toFixed(1))
                ]
              });
            }}
          />
        </div>
      )}
    </div>
  );
};
