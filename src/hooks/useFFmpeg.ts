"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  getOrLoadFFmpeg, 
  isFFmpegReady, 
  extractAudioFromVideo, 
  mergeAudioWithVideo, 
  synthesizeConvertedVoiceBlob,
  exportVideoWithPreset,
  checkWasmSupport,
  FFmpegLogCallback,
  FFmpegProgressCallback 
} from '../utils/ffmpegClient';
import { ConversionSettings, TerminalLog } from '../types';

export interface UseFFmpegState {
  isEngineReady: boolean;
  isLoadingEngine: boolean;
  isProcessing: boolean;
  progress: number;
  engineError: string | null;
  logs: TerminalLog[];
}

export function useFFmpeg() {
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isLoadingEngine, setIsLoadingEngine] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [logs, setLogs] = useState<TerminalLog[]>([]);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    // Check initial ready status
    setIsEngineReady(isFFmpegReady());

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addLog = useCallback((message: string, type: 'info' | 'process' | 'success' | 'warn' = 'info') => {
    if (!isMountedRef.current) return;
    const timestamp = new Date().toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setLogs((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2), timestamp, message, type }
    ]);
  }, []);

  const handleProgress: FFmpegProgressCallback = useCallback((prog) => {
    if (!isMountedRef.current) return;
    setProgress((prev) => Math.max(prev, Math.min(100, Math.round(prog))));
  }, []);

  /**
   * Preload the FFmpeg WebAssembly engine in the background
   */
  const loadEngine = useCallback(async () => {
    if (isFFmpegReady()) {
      setIsEngineReady(true);
      return true;
    }

    const wasmCheck = checkWasmSupport();
    if (!wasmCheck.supported) {
      const err = wasmCheck.reason || 'WebAssembly not supported in this browser';
      setEngineError(err);
      addLog(`[WASM Error] ${err}`, 'warn');
      return false;
    }

    try {
      setIsLoadingEngine(true);
      setEngineError(null);
      addLog('[Engine] Preparing WebAssembly worker thread...', 'info');

      await getOrLoadFFmpeg(handleProgress, (msg, type) => addLog(msg, type));

      if (isMountedRef.current) {
        setIsEngineReady(true);
        setIsLoadingEngine(false);
        addLog('[Engine] FFmpeg core loaded and ready for client-side processing', 'success');
      }
      return true;
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setEngineError(errorMsg);
        setIsLoadingEngine(false);
        addLog(`[Engine Error] ${errorMsg}`, 'warn');
      }
      return false;
    }
  }, [addLog, handleProgress]);

  /**
   * Feature Module A: Extract Audio from Video
   */
  const extractAudio = useCallback(async (videoFile: File | Blob | string) => {
    setIsProcessing(true);
    setEngineError(null);
    try {
      addLog('[Demuxer] Starting audio extraction pipeline...', 'info');
      const result = await extractAudioFromVideo(videoFile, handleProgress, addLog);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEngineError(msg);
      addLog(`[Extraction Error] ${msg}`, 'warn');
      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [addLog, handleProgress]);

  /**
   * Feature Module B: Merge Audio and Video
   */
  const mergeVideoAudio = useCallback(async (
    videoSource: File | Blob | string,
    audioSource: File | Blob | string
  ) => {
    setIsProcessing(true);
    setEngineError(null);
    try {
      addLog('[Muxer] Starting video-audio remuxing pipeline...', 'info');
      const result = await mergeAudioWithVideo(videoSource, audioSource, handleProgress, addLog);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEngineError(msg);
      addLog(`[Muxing Error] ${msg}`, 'warn');
      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [addLog, handleProgress]);

  /**
   * Run the complete VocalSwap Pipeline:
   * 1. Extract audio stream from user video using FFmpeg WebAssembly
   * 2. Synthesize/clone vocal harmonics via Hugging Face Inference / AI API / DSP
   * 3. Remux the new audio track back into the video container with FFmpeg Wasm
   */
  const runFullPipeline = useCallback(async (
    videoSource: File | Blob | string,
    targetPresetName: string,
    settings: ConversionSettings,
    videoDuration = 8,
    customVoiceConverter?: (extractedAudioBlob: Blob) => Promise<{ audioBlob: Blob; audioUrl: string }>,
    pipelineOptions?: { srtContent?: string }
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setEngineError(null);

    try {
      addLog('[Pipeline] Starting zero-cost client/server voice swap pipeline...', 'info');
      setProgress(5);

      // 1. Ensure FFmpeg is loaded
      await getOrLoadFFmpeg(handleProgress, addLog);
      setProgress(15);

      // 2. Extract original audio stream
      addLog('[Stage 1/3] Extracting audio stream from video container via FFmpeg WebAssembly...', 'process');
      const { audioBlob: originalAudioBlob, audioUrl: originalAudioUrl } = await extractAudioFromVideo(
        videoSource,
        (p) => setProgress(15 + Math.round(p * 0.2)),
        addLog
      );
      setProgress(35);

      // 3. AI Voice Transformation (Hugging Face / Gemini / DSP)
      let convertedVoiceBlob: Blob;
      let convertedVoiceUrl: string;

      if (customVoiceConverter) {
        addLog(`[Stage 2/3] Calling AI Voice Conversion API for target profile: "${targetPresetName}"...`, 'process');
        const converted = await customVoiceConverter(originalAudioBlob);
        convertedVoiceBlob = converted.audioBlob;
        convertedVoiceUrl = converted.audioUrl;
      } else {
        addLog(`[Stage 2/3] Synthesizing target timbre profile: "${targetPresetName}"...`, 'process');
        addLog(`[DSP] Pitch: ${settings.pitchShift > 0 ? `+${settings.pitchShift}` : settings.pitchShift} semitones | Timbre: ${settings.timbreFidelity}%`, 'info');
        
        convertedVoiceBlob = await synthesizeConvertedVoiceBlob(
          originalAudioBlob,
          targetPresetName,
          settings,
          videoDuration,
          addLog
        );
        convertedVoiceUrl = URL.createObjectURL(convertedVoiceBlob);
      }
      setProgress(68);

      // 4. Remux converted audio with video (and optional burn-in subtitles)
      addLog('[Stage 3/3] Multiplexing converted 48kHz audio into final MP4 container...', 'process');
      const { videoBlob: finalVideoBlob, videoUrl: finalVideoUrl } = await mergeAudioWithVideo(
        videoSource,
        convertedVoiceBlob,
        (p) => setProgress(68 + Math.round(p * 0.3)),
        addLog,
        {
          burnSubtitles: settings.burnSubtitles,
          srtContent: pipelineOptions?.srtContent,
          subtitleStyle: settings.subtitleStyle,
        }
      );

      setProgress(100);
      addLog('[Pipeline] VocalSwap processing complete! Output ready for preview & download.', 'success');

      return {
        finalVideoBlob,
        finalVideoUrl,
        convertedVoiceBlob,
        convertedVoiceUrl,
        originalAudioBlob,
        originalAudioUrl,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEngineError(msg);
      addLog(`[Pipeline Error] ${msg}`, 'warn');
      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [addLog, handleProgress]);

  /**
   * Feature Module C: High-Fidelity Custom Video Exporter
   */
  const exportCustomVideo = useCallback(async (
    videoSource: File | Blob | string,
    audioSource: File | Blob | string,
    format: 'mp4' | 'webm' | 'mov' = 'mp4',
    quality: 'original' | '1080p' | '720p' = 'original'
  ) => {
    setIsProcessing(true);
    setEngineError(null);
    try {
      addLog(`[Exporter] Transcoding video to ${format.toUpperCase()} (${quality} quality)...`, 'info');
      const result = await exportVideoWithPreset(
        videoSource,
        audioSource,
        format,
        quality,
        handleProgress,
        addLog
      );
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEngineError(msg);
      addLog(`[Export Error] ${msg}`, 'warn');
      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [addLog, handleProgress]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    isEngineReady,
    isLoadingEngine,
    isProcessing,
    progress,
    engineError,
    logs,
    addLog,
    clearLogs,
    loadEngine,
    extractAudio,
    mergeVideoAudio,
    exportCustomVideo,
    runFullPipeline,
  };
}
