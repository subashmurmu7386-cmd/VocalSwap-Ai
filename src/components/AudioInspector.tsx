import React, { useEffect, useState, useRef } from 'react';
import { 
  Activity, 
  Radio, 
  Cpu, 
  Layers, 
  Volume2, 
  Zap, 
  UploadCloud, 
  RefreshCw, 
  CheckCircle2, 
  Sliders,
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Download,
  FileAudio,
  VolumeX,
  Filter
} from 'lucide-react';
import { AudioInspectorMetadata, SilenceDetectionInfo } from '../types';
import { 
  getAudioContext, 
  formatTime, 
  detectAudioBufferSilence, 
  sliceAudioBuffer, 
  audioBufferToWavBlob,
  applyNoiseGateToBuffer
} from '../utils/audioUtils';

interface AudioInspectorProps {
  file?: File | Blob | null;
  audioUrl?: string | null;
  audioBuffer?: AudioBuffer | null;
  title?: string;
  subtitle?: string;
  className?: string;
  onMetadataExtracted?: (metadata: AudioInspectorMetadata) => void;
  onAutoTrimmed?: (trimmedBlob: Blob, trimmedUrl: string, trimRangeSec: [number, number]) => void;
  onNoiseGateApplied?: (gatedBlob: Blob, gatedUrl: string, gatedBuffer: AudioBuffer) => void;
}

/**
 * Audio Inspector Component
 * Decodes audio stream via the Web Audio API (decodeAudioData) to extract 
 * real-time sample rate, bitrate, channel configuration, auto-trim silence,
 * and programmatic noise gate background noise reduction.
 */
export const AudioInspector: React.FC<AudioInspectorProps> = ({
  file,
  audioUrl,
  audioBuffer: inputAudioBuffer,
  title = "Audio Inspector",
  subtitle = "Web Audio API Hardware Stream Telemetry",
  className = "",
  onMetadataExtracted,
  onAutoTrimmed,
  onNoiseGateApplied
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AudioInspectorMetadata | null>(null);
  const [activeFile, setActiveFile] = useState<File | Blob | null>(file || null);
  const [activeUrl, setActiveUrl] = useState<string | null>(audioUrl || null);
  
  // Audio Buffer & Silence State
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(inputAudioBuffer || null);
  const [thresholdDbfs, setThresholdDbfs] = useState<number>(-42);
  const [silenceInfo, setSilenceInfo] = useState<SilenceDetectionInfo | null>(null);
  
  // Trimmed Output State
  const [isTrimmed, setIsTrimmed] = useState<boolean>(false);
  const [trimmedBlob, setTrimmedBlob] = useState<Blob | null>(null);
  const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null);
  const [isPlayingTrimmedPreview, setIsPlayingTrimmedPreview] = useState<boolean>(false);

  // Noise Gate State
  const [noiseGateThreshold, setNoiseGateThreshold] = useState<number>(-45);
  const [isGated, setIsGated] = useState<boolean>(false);
  const [gatedBlob, setGatedBlob] = useState<Blob | null>(null);
  const [gatedUrl, setGatedUrl] = useState<string | null>(null);
  const [gatedBuffer, setGatedBuffer] = useState<AudioBuffer | null>(null);
  const [gatedStats, setGatedStats] = useState<{
    attenuatedPercentage: number;
    attenuatedSamplesCount: number;
    thresholdDbfs: number;
  } | null>(null);
  const [isPlayingGatedPreview, setIsPlayingGatedPreview] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize incoming props
  useEffect(() => {
    if (file) setActiveFile(file);
    if (audioUrl) setActiveUrl(audioUrl);
  }, [file, audioUrl]);

  // Extract metadata and detect silence when audio source changes
  useEffect(() => {
    let isCancelled = false;

    async function inspectAudio() {
      // If direct AudioBuffer provided
      if (inputAudioBuffer) {
        setDecodedBuffer(inputAudioBuffer);
        const silence = detectAudioBufferSilence(inputAudioBuffer, thresholdDbfs);
        setSilenceInfo(silence);

        const meta = compileFromAudioBuffer(inputAudioBuffer, silence);
        if (!isCancelled) {
          setMetadata(meta);
          setLoading(false);
          setError(null);
          if (onMetadataExtracted) onMetadataExtracted(meta);
        }
        return;
      }

      if (!activeFile && !activeUrl) {
        setMetadata(null);
        setDecodedBuffer(null);
        setSilenceInfo(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let arrayBuffer: ArrayBuffer;
        let fileSize: number | undefined;

        if (activeFile) {
          fileSize = activeFile.size;
          arrayBuffer = await activeFile.arrayBuffer();
        } else if (activeUrl) {
          const resp = await fetch(activeUrl);
          if (!resp.ok) throw new Error(`Failed to load audio from ${activeUrl}`);
          arrayBuffer = await resp.arrayBuffer();
          fileSize = arrayBuffer.byteLength;
        } else {
          setLoading(false);
          return;
        }

        // Parse WAV header if available for precise bit depth / bitrate
        const wavHeader = parseWavHeader(arrayBuffer);

        // Decode via Web Audio API
        const ctx = getAudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

        if (isCancelled) return;

        setDecodedBuffer(decoded);
        const silence = detectAudioBufferSilence(decoded, thresholdDbfs);
        setSilenceInfo(silence);

        const sampleRate = decoded.sampleRate;
        const channels = decoded.numberOfChannels;
        const durationSec = decoded.duration;
        const totalSamples = decoded.length;

        const channelConfig: 'mono' | 'stereo' | 'multi' = 
          channels === 1 ? 'mono' : channels === 2 ? 'stereo' : 'multi';

        const channelLayoutFormatted = 
          channels === 1 
            ? 'Mono (1.0 Single Channel)' 
            : channels === 2 
            ? 'Stereo (2.0 L/R Dual Channel)' 
            : `${channels}.0 Multi-Channel Matrix`;

        const bitDepth = wavHeader?.bitsPerSample || (sampleRate >= 48000 ? 24 : 16);
        const bitDepthFormatted = wavHeader?.audioFormat === 3 
          ? '32-bit Float IEEE' 
          : `${bitDepth}-bit ${bitDepth >= 24 ? 'Studio Pro' : 'Linear PCM'}`;

        let bitrateKbps = 0;
        if (wavHeader?.byteRate) {
          bitrateKbps = Math.round((wavHeader.byteRate * 8) / 1000);
        } else if (fileSize && durationSec > 0) {
          bitrateKbps = Math.round((fileSize * 8) / (durationSec * 1000));
        } else {
          bitrateKbps = Math.round((sampleRate * channels * bitDepth) / 1000);
        }

        const bitrateFormatted = `${bitrateKbps.toLocaleString()} kbps`;
        const sampleRateFormatted = `${(sampleRate / 1000).toFixed(1)} kHz`;
        const durationFormatted = formatTime(durationSec);

        let maxPeak = 0;
        for (let c = 0; c < channels; c++) {
          const channelData = decoded.getChannelData(c);
          const step = Math.max(1, Math.floor(channelData.length / 20000));
          for (let i = 0; i < channelData.length; i += step) {
            const val = Math.abs(channelData[i]);
            if (val > maxPeak) maxPeak = val;
          }
        }

        const peakDbfs = maxPeak > 0 ? `${(20 * Math.log10(maxPeak)).toFixed(1)} dBFS` : '-inf dBFS';

        const compiledMeta: AudioInspectorMetadata = {
          sampleRate,
          sampleRateFormatted,
          bitrateKbps,
          bitrateFormatted,
          channels,
          channelConfig,
          channelLayoutFormatted,
          durationSec,
          durationFormatted,
          totalSamples,
          bitDepth,
          bitDepthFormatted,
          peakDbfs,
          silenceInfo: silence,
        };

        setMetadata(compiledMeta);
        setLoading(false);
        if (onMetadataExtracted) onMetadataExtracted(compiledMeta);
      } catch (err: unknown) {
        if (!isCancelled) {
          console.warn('[AudioInspector] Web Audio API decode error:', err);
          setError(err instanceof Error ? err.message : 'Failed to decode audio metadata via Web Audio API');
          setLoading(false);
        }
      }
    }

    inspectAudio();

    return () => {
      isCancelled = true;
    };
  }, [activeFile, activeUrl, inputAudioBuffer]);

  // Recalculate silence info when sensitivity threshold changes
  const handleThresholdChange = (newThreshold: number) => {
    setThresholdDbfs(newThreshold);
    if (decodedBuffer) {
      const silence = detectAudioBufferSilence(decodedBuffer, newThreshold);
      setSilenceInfo(silence);
      if (metadata) {
        setMetadata({
          ...metadata,
          silenceInfo: silence
        });
      }
    }
  };

  // Perform Auto-Trim
  const handleExecuteAutoTrim = () => {
    if (!decodedBuffer || !silenceInfo || !silenceInfo.hasTrimableSilence) return;

    try {
      const ctx = getAudioContext();
      const sliced = sliceAudioBuffer(ctx, decodedBuffer, silenceInfo.startSample, silenceInfo.endSample);
      const wav = audioBufferToWavBlob(sliced);
      const url = URL.createObjectURL(wav);

      setTrimmedBlob(wav);
      setTrimmedUrl(url);
      setIsTrimmed(true);

      const startSec = silenceInfo.startSample / decodedBuffer.sampleRate;
      const endSec = silenceInfo.endSample / decodedBuffer.sampleRate;

      // Update local metadata view for trimmed result
      const trimmedSilence: SilenceDetectionInfo = {
        leadingSilenceSec: 0,
        trailingSilenceSec: 0,
        totalSilenceSec: 0,
        trimmedDurationSec: sliced.duration,
        startSample: 0,
        endSample: sliced.length,
        thresholdDbfs,
        hasTrimableSilence: false
      };

      const trimmedMeta = compileFromAudioBuffer(sliced, trimmedSilence);
      setMetadata(trimmedMeta);

      if (onAutoTrimmed) {
        onAutoTrimmed(wav, url, [startSec, endSec]);
      }
      if (onMetadataExtracted) {
        onMetadataExtracted(trimmedMeta);
      }
    } catch (err) {
      console.error('[AudioInspector] Auto-trim error:', err);
    }
  };

  // Revert Trim
  const handleRevertTrim = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingTrimmedPreview(false);
    }
    if (trimmedUrl) {
      URL.revokeObjectURL(trimmedUrl);
      setTrimmedUrl(null);
      setTrimmedBlob(null);
    }
    setIsTrimmed(false);

    if (decodedBuffer) {
      const silence = detectAudioBufferSilence(decodedBuffer, thresholdDbfs);
      setSilenceInfo(silence);
      const originalMeta = compileFromAudioBuffer(decodedBuffer, silence);
      setMetadata(originalMeta);
      if (onMetadataExtracted) onMetadataExtracted(originalMeta);
    }
  };

  // Play/Pause Trimmed Preview Audio
  const toggleTrimmedPreviewPlayback = () => {
    if (!trimmedUrl) return;

    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(trimmedUrl);
      audioPreviewRef.current.onended = () => setIsPlayingTrimmedPreview(false);
    } else if (audioPreviewRef.current.src !== trimmedUrl) {
      audioPreviewRef.current.src = trimmedUrl;
    }

    if (isPlayingTrimmedPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingTrimmedPreview(false);
    } else {
      audioPreviewRef.current.play().then(() => {
        setIsPlayingTrimmedPreview(true);
      }).catch(err => {
        console.warn('Trimmed audio preview playback error:', err);
      });
    }
  };

  // Perform Noise Gate Processing
  const handleExecuteNoiseGate = () => {
    const targetBuffer = decodedBuffer;
    if (!targetBuffer) return;

    try {
      const ctx = getAudioContext();
      const result = applyNoiseGateToBuffer(ctx, targetBuffer, noiseGateThreshold);
      const wav = audioBufferToWavBlob(result.processedBuffer);
      const url = URL.createObjectURL(wav);

      setGatedBlob(wav);
      setGatedUrl(url);
      setGatedBuffer(result.processedBuffer);
      setGatedStats({
        attenuatedPercentage: result.attenuatedPercentage,
        attenuatedSamplesCount: result.attenuatedSamplesCount,
        thresholdDbfs: result.noiseFloorDbfs
      });
      setIsGated(true);

      if (onNoiseGateApplied) {
        onNoiseGateApplied(wav, url, result.processedBuffer);
      }
    } catch (err) {
      console.error('[AudioInspector] Noise gate processing error:', err);
    }
  };

  // Revert Noise Gate
  const handleRevertNoiseGate = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingGatedPreview(false);
    }
    if (gatedUrl) {
      URL.revokeObjectURL(gatedUrl);
      setGatedUrl(null);
      setGatedBlob(null);
      setGatedBuffer(null);
    }
    setIsGated(false);
    setGatedStats(null);
  };

  // Play/Pause Gated Preview Audio
  const toggleGatedPreviewPlayback = () => {
    if (!gatedUrl) return;

    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(gatedUrl);
      audioPreviewRef.current.onended = () => setIsPlayingGatedPreview(false);
    } else if (audioPreviewRef.current.src !== gatedUrl) {
      audioPreviewRef.current.src = gatedUrl;
    }

    if (isPlayingGatedPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingGatedPreview(false);
    } else {
      audioPreviewRef.current.play().then(() => {
        setIsPlayingGatedPreview(true);
      }).catch(err => {
        console.warn('Gated audio preview playback error:', err);
      });
    }
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setActiveFile(selected);
      setActiveUrl(URL.createObjectURL(selected));
      setIsTrimmed(false);
      setIsGated(false);
      if (trimmedUrl) URL.revokeObjectURL(trimmedUrl);
      if (gatedUrl) URL.revokeObjectURL(gatedUrl);
      setTrimmedUrl(null);
      setTrimmedBlob(null);
      setGatedUrl(null);
      setGatedBlob(null);
      setGatedBuffer(null);
      setGatedStats(null);
    }
  };

  return (
    <div className={`rounded-2xl glass-panel bg-slate-950/80 border border-white/10 overflow-hidden shadow-2xl ${className}`}>
      {/* Top Inspector Header */}
      <div className="p-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#00f0ff]/20 to-[#a855f7]/20 border border-[#00f0ff]/30 text-[#00f0ff]">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>{title}</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
                Web Audio API
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="audio/*,video/*" 
            className="hidden" 
            onChange={handleCustomFileUpload} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel-subtle hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm"
            title="Upload audio/video file to inspect Web Audio API metadata"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span className="hidden sm:inline">Inspect File</span>
          </button>
        </div>
      </div>

      {/* Main Metadata Display Body */}
      <div className="p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#00f0ff] animate-spin" />
            <p className="text-xs text-slate-300 font-mono">
              Decoding PCM stream via Web Audio API...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            <p className="font-semibold">Metadata Extraction Warning</p>
            <p className="text-[11px] mt-1 text-slate-400">{error}</p>
          </div>
        ) : metadata ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Primary Core Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Sample Rate Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-cyan-500/30 text-center relative overflow-hidden group hover:border-cyan-400/60 transition-all">
                <div className="absolute top-2 right-2 text-cyan-500/30 group-hover:text-cyan-400/50 transition-colors">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-300">
                  Sample Rate
                </div>
                <div className="text-lg font-black text-white font-mono mt-1 tracking-tight">
                  {metadata.sampleRateFormatted}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {metadata.sampleRate.toLocaleString()} Hz PCM
                </div>
              </div>

              {/* 2. Bitrate Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-purple-500/30 text-center relative overflow-hidden group hover:border-purple-400/60 transition-all">
                <div className="absolute top-2 right-2 text-purple-500/30 group-hover:text-purple-400/50 transition-colors">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-300">
                  Bitrate
                </div>
                <div className="text-lg font-black text-white font-mono mt-1 tracking-tight">
                  {metadata.bitrateFormatted}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Stream Throughput
                </div>
              </div>

              {/* 3. Channel Configuration Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-pink-500/30 text-center relative overflow-hidden group hover:border-pink-400/60 transition-all">
                <div className="absolute top-2 right-2 text-pink-500/30 group-hover:text-pink-400/50 transition-colors">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-pink-300">
                  Channel Matrix
                </div>
                <div className="text-lg font-black text-white font-mono mt-1 tracking-tight capitalize flex items-center justify-center gap-1.5">
                  <span>{metadata.channelConfig}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    metadata.channelConfig === 'stereo' 
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' 
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {metadata.channels}.0
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                  {metadata.channelLayoutFormatted}
                </div>
              </div>
            </div>

            {/* Detailed Secondary Web Audio Telemetry Table */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                  Channel Layout:
                </span>
                <span className="text-cyan-300 font-bold">{metadata.channelLayoutFormatted}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  Bit Depth / Format:
                </span>
                <span className="text-white font-bold">{metadata.bitDepthFormatted}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-pink-400" />
                  Duration & Total PCM Samples:
                </span>
                <span className="text-white font-bold">
                  {metadata.durationFormatted} ({metadata.totalSamples.toLocaleString()} samples)
                </span>
              </div>

              {metadata.peakDbfs && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Peak Amplitude:
                  </span>
                  <span className="text-emerald-400 font-bold">{metadata.peakDbfs}</span>
                </div>
              )}
            </div>

            {/* Auto-Trim Silence Panel */}
            {silenceInfo && (
              <div className="p-4 rounded-xl glass-panel-subtle bg-slate-900/70 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Auto-Trim Silence Engine</span>
                        {isTrimmed && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Trimmed Active
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Detects & strips silent leading/trailing frames via Web Audio PCM scanning
                      </p>
                    </div>
                  </div>

                  {/* Threshold Sensitivity Control */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                    <span className="text-[9px] text-slate-400 font-mono px-1.5 hidden sm:inline">Sensitivity:</span>
                    {[-50, -42, -35].map((thresh) => (
                      <button
                        key={thresh}
                        type="button"
                        onClick={() => handleThresholdChange(thresh)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                          thresholdDbfs === thresh
                            ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold border border-[#00f0ff]/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {thresh === -50 ? 'Gentle (-50dB)' : thresh === -42 ? 'Balanced (-42dB)' : 'Aggressive (-35dB)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Silence Statistics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                    <div className="text-[9px] text-slate-400 uppercase">Leading Silence</div>
                    <div className="font-bold text-cyan-300 mt-0.5">
                      {silenceInfo.leadingSilenceSec.toFixed(2)}s
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                    <div className="text-[9px] text-slate-400 uppercase">Trailing Silence</div>
                    <div className="font-bold text-purple-300 mt-0.5">
                      {silenceInfo.trailingSilenceSec.toFixed(2)}s
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                    <div className="text-[9px] text-slate-400 uppercase">Total Silence</div>
                    <div className={`font-bold mt-0.5 ${silenceInfo.hasTrimableSilence ? 'text-amber-300' : 'text-slate-400'}`}>
                      {silenceInfo.totalSilenceSec.toFixed(2)}s
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                    <div className="text-[9px] text-slate-400 uppercase">Trimmed Duration</div>
                    <div className="font-bold text-emerald-300 mt-0.5">
                      {silenceInfo.trimmedDurationSec.toFixed(2)}s
                    </div>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                  {!isTrimmed ? (
                    <button
                      type="button"
                      onClick={handleExecuteAutoTrim}
                      disabled={!silenceInfo.hasTrimableSilence}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                        silenceInfo.hasTrimableSilence
                          ? 'bg-gradient-to-r from-[#00f0ff] to-purple-600 text-slate-950 hover:brightness-110 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      <Scissors className="w-4 h-4" />
                      <span>
                        {silenceInfo.hasTrimableSilence
                          ? `Auto-Trim -${silenceInfo.totalSilenceSec.toFixed(2)}s Silence`
                          : 'No Trimable Silence Detected'}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Play Preview */}
                      <button
                        type="button"
                        onClick={toggleTrimmedPreviewPlayback}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition-all"
                      >
                        {isPlayingTrimmedPreview ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-cyan-300" /> Pause Trimmed
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-cyan-300" /> Play Trimmed
                          </>
                        )}
                      </button>

                      {/* Download Trimmed WAV */}
                      {trimmedUrl && (
                        <a
                          href={trimmedUrl}
                          download={`autotrimmed-${Date.now()}.wav`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/30 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      )}

                      {/* Revert */}
                      <button
                        type="button"
                        onClick={handleRevertTrim}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-white/10 text-xs font-semibold hover:bg-slate-700 transition-all ml-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Revert
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 italic">
                    {isTrimmed
                      ? 'Trimmed audio applied. Revert anytime to restore full length.'
                      : silenceInfo.hasTrimableSilence
                      ? 'Click to automatically slice leading & trailing silent audio frames.'
                      : 'Audio is tightly trimmed with no excessive silence detected.'}
                  </p>
                </div>
              </div>
            )}

            {/* Programmatic Noise Gate Panel */}
            {decodedBuffer && (
              <div className="p-4 rounded-xl glass-panel-subtle bg-slate-900/70 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <VolumeX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Noise Gate Engine</span>
                        {isGated && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Gate Applied ({gatedStats?.thresholdDbfs}dBFS)
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Attenuates low-level room noise & hum below specified threshold before synthesis
                      </p>
                    </div>
                  </div>

                  {/* Noise Gate Quick Presets */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                    <span className="text-[9px] text-slate-400 font-mono px-1.5 hidden sm:inline">Gate Preset:</span>
                    {[
                      { label: 'Gentle (-55dB)', value: -55 },
                      { label: 'Moderate (-45dB)', value: -45 },
                      { label: 'Heavy (-35dB)', value: -35 }
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setNoiseGateThreshold(preset.value)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                          noiseGateThreshold === preset.value
                            ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Noise Gate Slider & Value Indicator */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-purple-400" />
                      Noise Floor Threshold:
                    </span>
                    <span className="text-purple-300 font-bold text-sm">
                      {noiseGateThreshold} dBFS
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500">-60dB</span>
                    <input
                      type="range"
                      min="-60"
                      max="-20"
                      step="1"
                      value={noiseGateThreshold}
                      onChange={(e) => setNoiseGateThreshold(Number(e.target.value))}
                      className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500">-20dB</span>
                  </div>

                  {/* Contextual noise floor description */}
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1">
                    <span>Studio Clean (-60dB to -50dB)</span>
                    <span>Standard Mic (-49dB to -40dB)</span>
                    <span>Noisy Ambient (-39dB to -20dB)</span>
                  </div>
                </div>

                {/* Gated Telemetry Output (if applied) */}
                {gatedStats && (
                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase">Gated Noise Floor</div>
                      <div className="font-bold text-purple-300 mt-0.5">
                        {gatedStats.thresholdDbfs} dBFS
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-[9px] text-slate-400 uppercase">Attenuated Samples</div>
                      <div className="font-bold text-emerald-300 mt-0.5">
                        {gatedStats.attenuatedPercentage}% ({gatedStats.attenuatedSamplesCount.toLocaleString()} samples)
                      </div>
                    </div>
                  </div>
                )}

                {/* Noise Gate Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                  {!isGated ? (
                    <button
                      type="button"
                      onClick={handleExecuteNoiseGate}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110 active:scale-95 transition-all shadow-md"
                    >
                      <VolumeX className="w-4 h-4" />
                      <span>Apply Noise Gate ({noiseGateThreshold} dBFS)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Play Gated Preview */}
                      <button
                        type="button"
                        onClick={toggleGatedPreviewPlayback}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/30 transition-all"
                      >
                        {isPlayingGatedPreview ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-purple-300" /> Pause Gated
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-purple-300" /> Play Gated
                          </>
                        )}
                      </button>

                      {/* Download Gated WAV */}
                      {gatedUrl && (
                        <a
                          href={gatedUrl}
                          download={`noisegated-${Date.now()}.wav`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-semibold hover:bg-pink-500/30 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      )}

                      {/* Revert */}
                      <button
                        type="button"
                        onClick={handleRevertNoiseGate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-white/10 text-xs font-semibold hover:bg-slate-700 transition-all ml-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Revert Gate
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 italic">
                    {isGated
                      ? 'Noise gate applied. Low-level ambient noise suppressed below threshold.'
                      : 'Adjust noise threshold slider and click to filter out background acoustic noise.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty / Idle State with Quick Inspection Trigger */
          <div className="p-6 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <FileAudio className="w-6 h-6 text-[#00f0ff]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">No Audio File Loaded for Telemetry</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload or select a video/audio file above to analyze Web Audio API metadata.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 px-3 py-1.5 rounded-xl bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 text-xs font-semibold transition-all"
            >
              Select Audio / Video File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/** Helper to compile metadata directly from an existing Web Audio API AudioBuffer */
function compileFromAudioBuffer(audioBuffer: AudioBuffer, silenceInfo?: SilenceDetectionInfo): AudioInspectorMetadata {
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const durationSec = audioBuffer.duration;
  const totalSamples = audioBuffer.length;

  const channelConfig = channels === 1 ? 'mono' : channels === 2 ? 'stereo' : 'multi';
  const channelLayoutFormatted = 
    channels === 1 
      ? 'Mono (1.0 Single Channel)' 
      : channels === 2 
      ? 'Stereo (2.0 L/R Dual Channel)' 
      : `${channels}.0 Multi-Channel Matrix`;

  const bitDepth = sampleRate >= 48000 ? 24 : 16;
  const bitrateKbps = Math.round((sampleRate * channels * bitDepth) / 1000);

  return {
    sampleRate,
    sampleRateFormatted: `${(sampleRate / 1000).toFixed(1)} kHz`,
    bitrateKbps,
    bitrateFormatted: `${bitrateKbps.toLocaleString()} kbps`,
    channels,
    channelConfig,
    channelLayoutFormatted,
    durationSec,
    durationFormatted: formatTime(durationSec),
    totalSamples,
    bitDepth,
    bitDepthFormatted: `${bitDepth}-bit Linear PCM`,
    silenceInfo
  };
}

/** Helper function to parse RIFF/WAV header byte views if available */
function parseWavHeader(buffer: ArrayBuffer): { bitsPerSample?: number; byteRate?: number; audioFormat?: number } | null {
  try {
    if (buffer.byteLength < 44) return null;
    const view = new DataView(buffer);
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (riff !== 'RIFF' || wave !== 'WAVE') return null;

    let offset = 12;
    while (offset < buffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'fmt ') {
        const audioFormat = view.getUint16(offset + 8, true);
        const byteRate = view.getUint32(offset + 16, true);
        const bitsPerSample = view.getUint16(offset + 22, true);
        return { bitsPerSample, byteRate, audioFormat };
      }
      offset += 8 + chunkSize;
    }
    return null;
  } catch {
    return null;
  }
}
