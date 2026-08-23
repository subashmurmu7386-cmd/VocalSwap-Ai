/**
 * Audio synthesis and processing utilities for VocalSwap
 */

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Generate a synthetic speech-like preview tone using harmonic oscillators
 */
export function playSyntheticVoicePreview(
  presetName: string,
  pitchShift: number = 0,
  durationSec: number = 2.5
): { stop: () => void; analyser: AnalyserNode | null } {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const baseFreq = presetName.toLowerCase().includes('morgan') || presetName.toLowerCase().includes('marcus')
      ? 110
      : presetName.toLowerCase().includes('aria') || presetName.toLowerCase().includes('elena')
      ? 220
      : 165;

    const modifiedBase = baseFreq * Math.pow(2, pitchShift / 12);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.35, now + 0.1);
    masterGain.gain.exponentialRampToValueAtTime(0.3, now + durationSec - 0.2);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    // Web Audio AnalyserNode for real-time waveform visualization
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    // Formant filter (speech simulation filter bank)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(modifiedBase * 3.5, now);
    filter.Q.setValueAtTime(4.0, now);
    filter.connect(masterGain);

    // Modulator for speech inflection
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(modifiedBase, now);
    // Add realistic pitch inflection (sentence cadence)
    osc1.frequency.exponentialRampToValueAtTime(modifiedBase * 1.15, now + 0.6);
    osc1.frequency.exponentialRampToValueAtTime(modifiedBase * 0.95, now + 1.4);
    osc1.frequency.exponentialRampToValueAtTime(modifiedBase * 0.85, now + durationSec);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(modifiedBase * 2.01, now);
    osc2.frequency.exponentialRampToValueAtTime(modifiedBase * 2.3, now + 0.6);
    osc2.frequency.exponentialRampToValueAtTime(modifiedBase * 1.8, now + durationSec);

    osc1.connect(filter);
    osc2.connect(filter);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durationSec);
    osc2.stop(now + durationSec);

    return {
      analyser,
      stop: () => {
        try {
          masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
          masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
            } catch {
              // ignore if already stopped
            }
          }, 60);
        } catch {
          // ignore
        }
      }
    };
  } catch (err) {
    console.warn('Audio preview playback error:', err);
    return { stop: () => {}, analyser: null };
  }
}

/**
 * Generate a synthetic audio Blob that can be played in audio/video elements
 */
export async function createSyntheticWavBlob(
  frequency = 220,
  durationSeconds = 4,
  voiceType: 'swapped' | 'original' = 'swapped'
): Promise<Blob> {
  const sampleRate = 44100;
  const numChannels = 2;
  const totalSamples = sampleRate * durationSeconds;
  const buffer = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Harmonic series with gentle vibrato and speech rhythm
    const f0 = frequency * (1 + 0.04 * Math.sin(6 * Math.PI * t));
    const envelope = Math.sin(Math.PI * (t / durationSeconds)) * (0.8 + 0.2 * Math.sin(10 * Math.PI * t));
    
    let sample = 0;
    if (voiceType === 'swapped') {
      // Warm, bright neural timbre
      sample = 0.5 * Math.sin(2 * Math.PI * f0 * t) +
               0.25 * Math.sin(4 * Math.PI * f0 * t) +
               0.15 * Math.sin(6 * Math.PI * f0 * t) +
               0.08 * Math.sin(8 * Math.PI * f0 * t);
    } else {
      // Original raw timbre
      sample = 0.4 * Math.sin(2 * Math.PI * (frequency * 0.8) * t) +
               0.3 * Math.sin(3 * Math.PI * (frequency * 0.8) * t) +
               0.1 * (Math.random() * 2 - 1);
    }
    buffer[i] = sample * envelope * 0.6;
  }

  // Convert Float32 buffer to 16-bit PCM WAV Blob
  const wavBytes = encodeWAV(buffer, sampleRate, numChannels);
  return new Blob([wavBytes], { type: 'audio/wav' });
}

function encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number): Uint8Array {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const buffer = new ArrayBuffer(44 + samples.length * numChannels * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * numChannels * 2, true);
  writeString(view, 8, 'WAVE');

  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // DATA sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * numChannels * 2, true);

  // Write audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, int16, true);
    view.setInt16(offset + 2, int16, true);
    offset += 4;
  }

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

import { SilenceDetectionInfo } from '../types';

export function detectAudioBufferSilence(
  buffer: AudioBuffer,
  thresholdDbfs: number = -42
): SilenceDetectionInfo {
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const totalSamples = buffer.length;
  if (totalSamples === 0) {
    return {
      leadingSilenceSec: 0,
      trailingSilenceSec: 0,
      totalSilenceSec: 0,
      trimmedDurationSec: 0,
      startSample: 0,
      endSample: 0,
      thresholdDbfs,
      hasTrimableSilence: false
    };
  }

  // Convert dBFS to linear amplitude threshold: amplitude = 10^(dBFS / 20)
  const linearThreshold = Math.pow(10, thresholdDbfs / 20);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  const windowSize = 256;
  const safetyMarginSec = 0.05; // 50ms safety margin to preserve transients
  const safetyMarginSamples = Math.floor(safetyMarginSec * sampleRate);

  // Find start sample (leading silence)
  let startSample = 0;
  for (let i = 0; i < totalSamples; i += windowSize) {
    let windowMax = 0;
    const limit = Math.min(i + windowSize, totalSamples);
    for (let j = i; j < limit; j++) {
      for (let c = 0; c < numChannels; c++) {
        const absVal = Math.abs(channelData[c][j]);
        if (absVal > windowMax) windowMax = absVal;
      }
    }
    if (windowMax >= linearThreshold) {
      startSample = Math.max(0, i - safetyMarginSamples);
      break;
    }
  }

  // Find end sample (trailing silence)
  let endSample = totalSamples;
  for (let i = totalSamples - 1; i >= 0; i -= windowSize) {
    let windowMax = 0;
    const limit = Math.max(0, i - windowSize);
    for (let j = i; j > limit; j--) {
      for (let c = 0; c < numChannels; c++) {
        const absVal = Math.abs(channelData[c][j]);
        if (absVal > windowMax) windowMax = absVal;
      }
    }
    if (windowMax >= linearThreshold) {
      endSample = Math.min(totalSamples, i + safetyMarginSamples);
      break;
    }
  }

  if (startSample >= endSample) {
    startSample = 0;
    endSample = totalSamples;
  }

  const leadingSilenceSec = startSample / sampleRate;
  const trailingSilenceSec = (totalSamples - endSample) / sampleRate;
  const totalSilenceSec = leadingSilenceSec + trailingSilenceSec;
  const trimmedDurationSec = (endSample - startSample) / sampleRate;

  // Consider trimable if total silence is at least 0.1s
  const hasTrimableSilence = totalSilenceSec >= 0.1 && (endSample - startSample) > 0;

  return {
    leadingSilenceSec,
    trailingSilenceSec,
    totalSilenceSec,
    trimmedDurationSec,
    startSample,
    endSample,
    thresholdDbfs,
    hasTrimableSilence
  };
}

export function sliceAudioBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  startSample: number,
  endSample: number
): AudioBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const newLength = Math.max(1, endSample - startSample);
  const newBuffer = ctx.createBuffer(numChannels, newLength, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = newBuffer.getChannelData(c);
    dst.set(src.subarray(startSample, endSample));
  }

  return newBuffer;
}

export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const format = 1; // 1 = PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // FMT Sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // DATA Sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels & convert Float32 to 16-bit PCM
  const channelData: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

export interface NoiseGateResult {
  processedBuffer: AudioBuffer;
  attenuatedSamplesCount: number;
  attenuatedPercentage: number;
  noiseFloorDbfs: number;
}

/**
 * Applies a digital Noise Gate to an AudioBuffer, suppressing background noise below a threshold (dBFS)
 */
export function applyNoiseGateToBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  thresholdDbfs: number = -45,
  attackMs: number = 5,
  releaseMs: number = 40,
  floorDbfs: number = -80
): NoiseGateResult {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const newBuffer = ctx.createBuffer(numChannels, length, sampleRate);
  
  const linearThreshold = Math.pow(10, thresholdDbfs / 20);
  const floorLinear = Math.pow(10, floorDbfs / 20);

  const attackCoeff = Math.exp(-1.0 / Math.max(1, sampleRate * (attackMs / 1000)));
  const releaseCoeff = Math.exp(-1.0 / Math.max(1, sampleRate * (releaseMs / 1000)));

  let totalAttenuatedSamples = 0;

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = newBuffer.getChannelData(c);
    let currentGain = 1.0;

    for (let i = 0; i < length; i++) {
      const sample = src[i];
      const absSample = Math.abs(sample);

      const targetGain = absSample >= linearThreshold ? 1.0 : floorLinear;

      if (targetGain > currentGain) {
        currentGain = attackCoeff * currentGain + (1.0 - attackCoeff) * targetGain;
      } else {
        currentGain = releaseCoeff * currentGain + (1.0 - releaseCoeff) * targetGain;
      }

      if (currentGain < 0.95) {
        totalAttenuatedSamples++;
      }

      dst[i] = sample * currentGain;
    }
  }

  const totalPossibleSamples = length * numChannels;
  const attenuatedPercentage = totalPossibleSamples > 0 
    ? Number(((totalAttenuatedSamples / totalPossibleSamples) * 100).toFixed(1))
    : 0;

  return {
    processedBuffer: newBuffer,
    attenuatedSamplesCount: totalAttenuatedSamples,
    attenuatedPercentage,
    noiseFloorDbfs: thresholdDbfs
  };
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
