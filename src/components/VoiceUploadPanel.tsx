import React, { useRef, useState, useEffect } from 'react';
import { 
  Mic, 
  UploadCloud, 
  Play, 
  Pause, 
  Trash2, 
  Square, 
  CheckCircle2, 
  Radio, 
  Activity,
} from 'lucide-react';
import { AudioSampleState } from '../types';
import { playSyntheticVoicePreview, formatTime } from '../utils/audioUtils';
import { AudioTrimRangeSlider } from './AudioTrimRangeSlider';
import { AudioInspector } from './AudioInspector';

interface VoiceUploadPanelProps {
  voiceState: AudioSampleState | null;
  onVoiceSelect: (voice: AudioSampleState) => void;
  onVoiceRemove: () => void;
}

export const VoiceUploadPanel: React.FC<VoiceUploadPanelProps> = ({
  voiceState,
  onVoiceSelect,
  onVoiceRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Playback state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const previewStopperRef = useRef<{ stop: () => void } | null>(null);

  // Canvas visualizer ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clean up timer and audio on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (previewStopperRef.current) previewStopperRef.current.stop();
    };
  }, []);

  // Animate dynamic waveform when previewing audio or idling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Draw subtle background grid line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      const bars = 48;
      const barWidth = width / bars - 2;

      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + 2) + 2;
        // Harmonic height formula
        const norm = Math.sin((i / bars) * Math.PI);
        const dynamicAmp = isPlayingPreview
          ? Math.sin(phase + i * 0.4) * 0.5 + 0.5
          : isRecording
          ? (audioLevel / 100) * (Math.sin(phase * 2 + i * 0.6) * 0.5 + 0.5)
          : Math.sin(i * 0.25) * 0.25 + 0.35;

        const barHeight = Math.max(4, norm * dynamicAmp * (height * 0.75));

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, midY - barHeight / 2, 0, midY + barHeight / 2);
        grad.addColorStop(0, '#00f0ff');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#ec4899');

        ctx.fillStyle = grad;
        ctx.beginPath();
        // Rounded bar
        const r = Math.min(barWidth / 2, 3);
        const y = midY - barHeight / 2;
        ctx.roundRect(x, y, barWidth, barHeight, r);
        ctx.fill();
      }

      phase += isPlayingPreview ? 0.15 : isRecording ? 0.25 : 0.03;
      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlayingPreview, isRecording, audioLevel, voiceState]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) {
      alert('Please upload a valid audio file (.wav, .mp3, .m4a, .ogg)');
      return;
    }

    const url = URL.createObjectURL(file);
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      const dur = tempAudio.duration || 5;
      onVoiceSelect({
        file,
        url,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        duration: dur,
        source: 'upload',
        isSample: false,
        trimRange: [0, Number(dur.toFixed(1))]
      });
    };
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Real Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Audio analysis for meter
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        const dur = recordSeconds || 4;
        onVoiceSelect({
          file: new File([audioBlob], 'My_Recorded_Voice_Sample.wav', { type: 'audio/wav' }),
          url,
          name: 'Live_Microphone_Sample.wav',
          size: `${(audioBlob.size / 1024).toFixed(1)} KB`,
          duration: dur,
          source: 'record',
          isSample: false,
          trimRange: [0, Number(dur.toFixed(1))]
        });

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access error:', err);
      setIsRecording(false);
      alert('Microphone access was denied or not supported in this browser. Please allow microphone permissions or upload an audio file.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const togglePlayVoicePreview = () => {
    if (isPlayingPreview) {
      if (previewStopperRef.current) {
        previewStopperRef.current.stop();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      const startTrim = voiceState?.trimRange ? voiceState.trimRange[0] : 0;
      const endTrim = voiceState?.trimRange ? voiceState.trimRange[1] : (voiceState?.duration || 3);
      const trimDuration = Math.max(0.5, endTrim - startTrim);

      if (voiceState?.url) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio(voiceState.url);
        }
        audioPlayerRef.current.currentTime = startTrim;
        audioPlayerRef.current.play().then(() => {
          const timeout = window.setTimeout(() => {
            if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
              audioPlayerRef.current.currentTime = startTrim;
            }
            setIsPlayingPreview(false);
          }, trimDuration * 1000);
          previewStopperRef.current = {
            stop: () => {
              clearTimeout(timeout);
              if (audioPlayerRef.current) audioPlayerRef.current.pause();
            }
          };
        }).catch(() => {
          // fallback tone
          const stopper = playSyntheticVoicePreview(voiceState.name, 0, trimDuration);
          previewStopperRef.current = stopper;
          setTimeout(() => setIsPlayingPreview(false), trimDuration * 1000);
        });
      } else {
        const stopper = playSyntheticVoicePreview(voiceState?.name || 'Voice', 0, trimDuration);
        previewStopperRef.current = stopper;
        setTimeout(() => setIsPlayingPreview(false), trimDuration * 1000);
      }
    }
  };

  return (
    <div 
      id="panel-step-2-voice" 
      className="flex flex-col h-full rounded-2xl glass-panel p-5 sm:p-6 transition-all duration-300 relative overflow-hidden group"
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7] font-bold text-xs font-mono">
            02
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              Voice Sample
              <span className="text-[11px] font-normal text-slate-400">(.wav, .mp3)</span>
            </h2>
          </div>
        </div>

        {voiceState && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Cloned
            </span>
            <button
              id="btn-remove-voice"
              onClick={onVoiceRemove}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Remove voice sample"
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
        accept="audio/*,.wav,.mp3,.m4a,.ogg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Main Content Area */}
      {!voiceState ? (
        <div className="flex-1 flex flex-col justify-center space-y-4">
          {/* Sub Tab Switcher: Upload / Record */}
          <div className="flex p-1 rounded-xl glass-panel-subtle bg-slate-900/60 text-xs font-medium">
            <button
              id="tab-voice-upload"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-[#00f0ff]/20 to-[#a855f7]/20 text-white border border-[#00f0ff]/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Upload Audio Sample</span>
            </button>

            <button
              id="tab-voice-record"
              onClick={() => setActiveTab('record')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'record'
                  ? 'bg-gradient-to-r from-[#a855f7]/20 to-[#ec4899]/20 text-white border border-[#a855f7]/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-[#ec4899]" />
              <span>Record Live Microphone</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div
              id="dropzone-voice-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-h-[170px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? 'border-[#a855f7] bg-[#a855f7]/10 shadow-lg shadow-[#a855f7]/20 scale-[1.01]'
                  : 'border-white/15 hover:border-[#a855f7]/50 hover:bg-white/[0.03]'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#a855f7]/20 to-[#ec4899]/20 border border-white/10 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 text-[#a855f7]" />
              </div>
              <p className="text-sm font-semibold text-white">
                Upload target vocal sample
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Drop audio clip or <span className="text-[#a855f7] underline underline-offset-2">browse files</span>
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">WAV</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">MP3</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">M4A</span>
                <span>Min 3s speech</span>
              </div>
            </div>
          )}

          {/* Tab 2: Live Recording */}
          {activeTab === 'record' && (
            <div 
              id="container-mic-recording"
              className="flex-1 min-h-[170px] rounded-xl border border-white/10 glass-panel-subtle flex flex-col items-center justify-center p-5 text-center space-y-3"
            >
              {isRecording ? (
                <div className="flex flex-col items-center space-y-3 w-full max-w-xs">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                      <Radio className="w-8 h-8 text-red-400" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </div>

                  <div className="text-center font-mono">
                    <span className="text-lg font-bold text-white">00:{recordSeconds.toString().padStart(2, '0')}</span>
                    <p className="text-[11px] text-red-300">Recording live vocal timbre...</p>
                  </div>

                  {/* Real-time decibel level meter */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-red-500 transition-all duration-75"
                      style={{ width: `${Math.max(8, audioLevel)}%` }}
                    />
                  </div>

                  <button
                    id="btn-stop-recording"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-semibold shadow-lg shadow-red-500/20 transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop & Save Vocal Sample</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <button
                    id="btn-start-recording"
                    onClick={startRecording}
                    className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#ec4899] to-[#a855f7] p-[1px] shadow-lg shadow-[#ec4899]/30 hover:scale-105 active:scale-95 transition-all"
                  >
                    <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center group-hover:bg-transparent transition-colors">
                      <Mic className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    </div>
                  </button>
                  <div>
                    <p className="text-xs font-semibold text-white">Click to record with microphone</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Speak 5-10 seconds of clear speech</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Voice Uploaded / Selected Preview State */
        <div className="flex-1 flex flex-col space-y-3">
          {/* Interactive Voice Waveform Visualization Box */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950/70 border border-white/10 p-3 flex flex-col justify-between h-[155px]">
            {/* Waveform Canvas */}
            <div className="relative w-full h-[85px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={360}
                height={80}
                className="w-full h-full object-contain"
              />
              
              {/* Overlay Play Tone Preview Button */}
              <button
                id="btn-play-voice-waveform"
                onClick={togglePlayVoicePreview}
                className="absolute inset-0 m-auto w-11 h-11 rounded-full glass-panel flex items-center justify-center text-white border border-[#a855f7]/40 shadow-lg hover:scale-110 active:scale-95 transition-all bg-slate-900/60 backdrop-blur-md"
                title={isPlayingPreview ? 'Pause sample preview' : 'Play sample preview'}
              >
                {isPlayingPreview ? (
                  <Pause className="w-5 h-5 text-[#a855f7]" />
                ) : (
                  <Play className="w-5 h-5 text-[#a855f7] translate-x-0.5" />
                )}
              </button>
            </div>

            {/* Bottom info bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono pt-2 border-t border-white/5">
              <span className="flex items-center gap-1 text-purple-300">
                <Activity className="w-3 h-3 text-[#a855f7]" />
                Neural Embedding Extracted
              </span>
              <span>{formatTime(voiceState.duration)}</span>
            </div>
          </div>

          {/* Interactive Start/End Voice Sample Audio Trimmer */}
          <AudioTrimRangeSlider
            duration={voiceState.duration || 5}
            trimRange={voiceState.trimRange || [0, Number((voiceState.duration || 5).toFixed(1))]}
            audioUrl={voiceState.url}
            onChange={(newRange) => {
              onVoiceSelect({
                ...voiceState,
                trimRange: newRange,
              });
            }}
          />

          {/* Voice Sample Metadata Card */}
          <div className="p-3 rounded-xl glass-panel-subtle space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white truncate max-w-[200px]" title={voiceState.name}>
                {voiceState.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                {voiceState.source === 'preset' ? 'Preset Model' : voiceState.source === 'record' ? 'Live Mic' : 'Audio File'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Sampling: 48,000 Hz Studio</span>
              <span className="font-mono">{voiceState.size}</span>
            </div>
          </div>

          {/* Audio Inspector for Voice Sample */}
          <AudioInspector
            audioUrl={voiceState.url}
            title="Voice Sample Inspector"
            subtitle="Live Web Audio API stream telemetry"
            className="mt-2"
            onAutoTrimmed={(trimmedBlob, trimmedUrl, trimRange) => {
              const newDuration = Number((trimRange[1] - trimRange[0]).toFixed(1));
              onVoiceSelect({
                ...voiceState,
                url: trimmedUrl,
                file: new File([trimmedBlob], `trimmed-${voiceState.name || 'voice'}.wav`, { type: 'audio/wav' }),
                duration: newDuration > 0 ? newDuration : voiceState.duration,
                trimRange: [0, newDuration > 0 ? newDuration : voiceState.duration],
              });
            }}
            onNoiseGateApplied={(gatedBlob, gatedUrl) => {
              onVoiceSelect({
                ...voiceState,
                url: gatedUrl,
                file: new File([gatedBlob], `noisegated-${voiceState.name || 'voice'}.wav`, { type: 'audio/wav' }),
              });
            }}
          />
        </div>
      )}
    </div>
  );
};
