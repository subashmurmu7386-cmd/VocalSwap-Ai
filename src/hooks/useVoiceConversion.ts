"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { ConversionSettings } from '../types';

export interface ConvertVoiceParams {
  sourceAudioBlob: Blob;
  targetVoiceBlob?: Blob | null;
  targetVoiceName?: string;
  settings: ConversionSettings;
  videoDuration?: number;
  trimRange?: [number, number];
  onProgress?: (progress: number) => void;
  onLog?: (message: string, type: 'info' | 'process' | 'success' | 'warn') => void;
}

export interface VoiceConversionState {
  isConverting: boolean;
  conversionProgress: number;
  convertedAudioBlob: Blob | null;
  convertedAudioUrl: string | null;
  error: string | null;
  modelUsed: string | null;
  transcript: string | null;
}

export function useVoiceConversion() {
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [convertedAudioBlob, setConvertedAudioBlob] = useState<Blob | null>(null);
  const [convertedAudioUrl, setConvertedAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const activeAudioUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      }
    };
  }, []);

  const convertVoice = useCallback(async ({
    sourceAudioBlob,
    targetVoiceBlob,
    targetVoiceName = 'Morgan Vance',
    settings,
    videoDuration = 8,
    trimRange,
    onProgress,
    onLog,
  }: ConvertVoiceParams): Promise<{ audioBlob: Blob; audioUrl: string; modelDetails: string }> => {
    setIsConverting(true);
    setConversionProgress(10);
    setError(null);
    if (onProgress) onProgress(10);

    try {
      if (onLog) {
        onLog(`[AI Engine] Preparing audio payload for voice: "${targetVoiceName}"...`, 'info');
        if (trimRange) {
          onLog(`[Audio Trim] Active sample range: ${trimRange[0].toFixed(1)}s - ${trimRange[1].toFixed(1)}s (${(trimRange[1] - trimRange[0]).toFixed(1)}s)`, 'info');
        }
      }

      // Construct multipart form data
      const formData = new FormData();
      formData.append('sourceAudio', sourceAudioBlob, 'extracted_source.wav');

      if (targetVoiceBlob) {
        formData.append('targetVoiceSample', targetVoiceBlob, 'target_sample.wav');
      }

      if (trimRange) {
        formData.append('trimStart', trimRange[0].toString());
        formData.append('trimEnd', trimRange[1].toString());
      }

      formData.append('voicePresetName', targetVoiceName);
      formData.append('pitchShift', settings.pitchShift.toString());
      formData.append('timbreFidelity', settings.timbreFidelity.toString());
      formData.append('preserveBackgroundMusic', settings.preserveBackgroundMusic.toString());
      formData.append('backgroundMusicVolume', settings.backgroundMusicVolume.toString());
      formData.append('autoNormalizeAudio', (settings.autoNormalizeAudio ?? true).toString());
      formData.append('duration', videoDuration.toString());
      if (settings.genderMode) {
        formData.append('genderMode', settings.genderMode);
      }
      if (settings.targetGender) {
        formData.append('targetGender', settings.targetGender);
      }

      if (onProgress) onProgress(30);
      setConversionProgress(30);

      if (onLog) {
        onLog('[AI Engine] Dispatching request to /api/convert-voice (Hugging Face / Neural Pipeline)...', 'process');
      }

      // Call the API endpoint with timeout and abort handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch('/api/convert-voice', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (onProgress) onProgress(75);
      setConversionProgress(75);

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({ error: `HTTP ${response.status} Error` }));
        throw new Error(errorJson.details || errorJson.error || `Server responded with status ${response.status}`);
      }

      const rawModelHeader = response.headers.get('X-VocalSwap-Model');
      const pipelineHeader = response.headers.get('X-VocalSwap-Pipeline');
      const transcriptHeader = response.headers.get('X-VocalSwap-Transcript');

      const modelDetails = rawModelHeader ? decodeURIComponent(rawModelHeader) : 'AI Voice Synthesis Engine';
      const parsedTranscript = transcriptHeader ? decodeURIComponent(transcriptHeader) : null;

      if (onLog) {
        onLog(`[AI Engine] Received response via ${pipelineHeader || 'Neural'} pipeline (${modelDetails})`, 'success');
        if (parsedTranscript) {
          onLog(`[AI Speech] Transcribed: "${parsedTranscript}"`, 'info');
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      }
      activeAudioUrlRef.current = audioUrl;

      if (isMountedRef.current) {
        setConvertedAudioBlob(audioBlob);
        setConvertedAudioUrl(audioUrl);
        setModelUsed(modelDetails);
        setTranscript(parsedTranscript);
        setConversionProgress(100);
        setIsConverting(false);
      }

      if (onProgress) onProgress(100);

      return { audioBlob, audioUrl, modelDetails };
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort ? 'Voice conversion timed out after 60 seconds.' : err instanceof Error ? err.message : String(err);

      if (onLog) {
        onLog(`[AI Engine Warning] ${msg}`, 'warn');
        onLog('[AI Engine] Seamlessly engaging client-side fallback formant synthesizer...', 'process');
      }

      if (isMountedRef.current) {
        setError(msg);
        setIsConverting(false);
      }

      throw err;
    }
  }, []);

  const resetState = useCallback(() => {
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    setConvertedAudioBlob(null);
    setConvertedAudioUrl(null);
    setError(null);
    setModelUsed(null);
    setTranscript(null);
    setConversionProgress(0);
    setIsConverting(false);
  }, []);

  return {
    isConverting,
    conversionProgress,
    convertedAudioBlob,
    convertedAudioUrl,
    error,
    modelUsed,
    transcript,
    convertVoice,
    resetState,
  };
}
