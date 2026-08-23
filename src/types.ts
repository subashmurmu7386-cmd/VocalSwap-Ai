export type AppStep = 'upload' | 'processing' | 'completed';
export type GenderConversionMode = 'male-to-female' | 'female-to-male' | 'custom';

export interface VideoFileState {
  file: File | null;
  url: string | null;
  name: string;
  size: string;
  duration: number; // in seconds
  dimensions: { width: number; height: number };
  originalAudioTrack?: string;
  thumbnailUrl?: string;
  isSample?: boolean;
  trimRange?: [number, number]; // [startTimeSec, endTimeSec]
}

export interface AudioSampleState {
  file: File | null;
  url: string | null;
  name: string;
  size: string;
  duration: number; // in seconds
  source: 'upload' | 'record' | 'preset';
  presetId?: string;
  isSample?: boolean;
  trimRange?: [number, number]; // [startTimeSec, endTimeSec]
}

export interface VoicePreset {
  id: string;
  name: string;
  category: 'Cinematic' | 'Narrator' | 'Character' | 'Podcast' | 'Celebrity Style';
  gender: 'Female' | 'Male' | 'Neutral';
  avatar: string;
  sampleAudioUrl?: string;
  sampleFrequency: number;
  pitchShift: number;
  timbreDescription: string;
  tags: string[];
  recommendedUse: string;
}

export interface ConversionSettings {
  model: 'neural-v3-ultra' | 'studio-pro' | 'fastsync-v2';
  genderMode?: GenderConversionMode;
  targetGender?: 'Female' | 'Male' | 'Custom';
  pitchShift: number; // -5 to +5 semitones (or -12 to +12)
  voiceSpeed: number; // 0.5x to 2.0x
  timbreFidelity: number; // 0 to 100%
  preserveBackgroundMusic: boolean;
  backgroundMusicVolume: number; // 0 to 100%
  lipSyncAccuracy: 'high' | 'ultra' | 'balanced';
  noiseReduction: boolean;
  autoNormalizeAudio?: boolean;
  burnSubtitles?: boolean;
  subtitleStyle?: 'glass' | 'bold' | 'yellow' | 'minimal';
  autoTimeStretch?: boolean;
  outputFormat: 'mp4-1080p' | 'mp4-4k' | 'wav-only';
}

export type ExportFormat = 'mp4' | 'webm' | 'mov';
export type ExportQuality = 'original' | '1080p' | '720p';

export interface ExportPresetConfig {
  format: ExportFormat;
  quality: ExportQuality;
  crf: number;
  audioBitrate: string;
  preset: string;
}

export interface ProcessingStage {
  id: string;
  title: string;
  description: string;
  progressRange: [number, number];
  status: 'pending' | 'active' | 'completed';
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'process' | 'warn';
}

export interface OutputMediaState {
  videoBlob: Blob | null;
  videoUrl: string | null;
  convertedAudioBlob: Blob | null;
  convertedAudioUrl: string | null;
  originalAudioBlob: Blob | null;
  originalAudioUrl: string | null;
  srtContent?: string | null;
  timestamp: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'error';
}

export interface AudioTechnicalMetadata {
  sampleRate: number;
  sampleRateFormatted: string;
  bitDepth: number;
  bitDepthFormatted: string;
  channels: number;
  channelLayout: string;
  codec: string;
  bitrateKbps: number;
  bitrateFormatted: string;
  peakDbfs?: string;
  lufsLoudness?: string;
  frequencyRange?: string;
  dynamicRangeDb?: string;
  durationFormatted?: string;
  containerFormat?: string;
}

export interface WordTimestamp {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface SpeakerSegment {
  speakerId: string; // e.g. "Speaker 1", "Speaker 2"
  speakerName?: string;
  text: string;
  start: number; // start time in seconds
  end: number;   // end time in seconds
  assignedVoiceId?: string;
  assignedVoiceName?: string;
  customVoiceUrl?: string;
}

export interface GeminiAudioAnalysis {
  transcript: string;
  language: string;
  tone: string;
  detectedGender?: 'Male' | 'Female' | 'Neutral';
  wordTimestamps: WordTimestamp[];
  speakers?: SpeakerSegment[];
  srtContent?: string;
  translatedText?: string;
  pacingRecommendation?: string;
  durationSec?: number;
  confidenceScore?: number;
  modelUsed?: string;
  isAiGenerated?: boolean;
}

export interface QueueItem {
  id: string;
  videoState: VideoFileState;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: number;
  outputMedia?: OutputMediaState | null;
  geminiAnalysis?: GeminiAudioAnalysis | null;
  error?: string | null;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  processingTimeSec?: number;
}

export interface SilenceDetectionInfo {
  leadingSilenceSec: number;
  trailingSilenceSec: number;
  totalSilenceSec: number;
  trimmedDurationSec: number;
  startSample: number;
  endSample: number;
  thresholdDbfs: number;
  hasTrimableSilence: boolean;
}

export interface AudioInspectorMetadata {
  sampleRate: number; // Hz, e.g. 48000
  sampleRateFormatted: string; // e.g. "48.0 kHz"
  bitrateKbps: number; // e.g. 1536
  bitrateFormatted: string; // e.g. "1,536 kbps"
  channels: number; // e.g. 1 or 2
  channelConfig: 'mono' | 'stereo' | 'multi'; // "mono" | "stereo" | "multi"
  channelLayoutFormatted: string; // e.g. "Stereo (2.0 L/R)"
  durationSec: number; // e.g. 15.2
  durationFormatted: string; // e.g. "0:15.2"
  totalSamples: number; // e.g. 729600
  bitDepth: number; // e.g. 16, 24, or 32
  bitDepthFormatted: string; // e.g. "24-bit Float"
  peakDbfs?: string; // e.g. "-0.3 dBFS"
  silenceInfo?: SilenceDetectionInfo;
}



