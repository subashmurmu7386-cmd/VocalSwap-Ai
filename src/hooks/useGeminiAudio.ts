"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { GeminiAudioAnalysis } from '../types';

export interface UseGeminiAudioReturn {
  isAnalyzing: boolean;
  analysisData: GeminiAudioAnalysis | null;
  error: string | null;
  analyzeAudio: (audioSource: Blob | File, customPrompt?: string) => Promise<GeminiAudioAnalysis | null>;
  resetAnalysis: () => void;
  setAnalysisData: (data: GeminiAudioAnalysis | null) => void;
}

/**
 * Custom React hook for analyzing extracted audio via Google Gemini API route handler (/api/gemini/analyze).
 * Automatically triggered after client-side FFmpeg extracts the .wav audio file from uploaded video.
 * Transcribes spoken dialogue, detects language, extracts vocal tone,
 * and generates word-level timestamps for precise voice swapping and lip-sync alignment.
 */
export function useGeminiAudio(): UseGeminiAudioReturn {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<GeminiAudioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const analyzeAudio = useCallback(async (audioSource: Blob | File, customPrompt?: string): Promise<GeminiAudioAnalysis | null> => {
    if (!audioSource) {
      const err = 'No audio source provided for Gemini analysis.';
      setError(err);
      return null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      const filename = (audioSource as File).name || 'extracted_audio.wav';
      formData.append('audio', audioSource, filename);
      if (customPrompt) {
        formData.append('prompt', customPrompt);
      }

      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45-second timeout

      let response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      // Fallback endpoint if route is mounted on /api/analyze-audio
      if (response.status === 404) {
        response = await fetch('/api/analyze-audio', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({ error: `HTTP ${response.status} Error` }));
        throw new Error(errorJson.details || errorJson.error || `Server responded with status ${response.status}`);
      }

      const json = await response.json();
      const analysisResult: GeminiAudioAnalysis = json.analysis || json.data;

      if (isMountedRef.current) {
        setAnalysisData(analysisResult);
        setIsAnalyzing(false);
      }

      return analysisResult;
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? 'Gemini audio analysis request timed out.'
        : err instanceof Error
        ? err.message
        : String(err);

      console.warn('[useGeminiAudio] Error analyzing audio:', msg);

      if (isMountedRef.current) {
        setError(msg);
        setIsAnalyzing(false);
      }

      return null;
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAnalysisData(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return {
    isAnalyzing,
    analysisData,
    error,
    analyzeAudio,
    resetAnalysis,
    setAnalysisData,
  };
}
