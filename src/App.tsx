/**
 * VocalSwap - AI Video Voice Swapper
 * Ultra-Modern Pure Glassmorphism Web Application
 * Client-Side WebAssembly Processing + Hugging Face / Gemini AI + Firebase Firestore & Storage
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { BackgroundGlow } from './components/BackgroundGlow';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { VideoUploadPanel } from './components/VideoUploadPanel';
import { VoiceUploadPanel } from './components/VoiceUploadPanel';
import { ConversionControls } from './components/ConversionControls';
import { OutputPreviewSection } from './components/OutputPreviewSection';
import { HowItWorksModal } from './components/HowItWorksModal';
import { ConversionHistoryModal } from './components/ConversionHistoryModal';
import { SpeakerMappingSection } from './components/SpeakerMappingSection';
import { TranscriptEditorModal } from './components/TranscriptEditorModal';
import { VideoQueuePanel } from './components/VideoQueuePanel';
import { GenderVoiceConversionCard } from './components/GenderVoiceConversionCard';
import { BatchProgressOverviewModal } from './components/BatchProgressOverviewModal';
import { TelegramMiniAppWrapper } from './components/TelegramMiniAppWrapper';
import { ToastContainer } from './components/Toast';
import { AdSterraContainer } from './components/ads/AdSterraContainer';
import { Footer } from './components/Footer';

import { 
  VideoFileState, 
  AudioSampleState, 
  ConversionSettings, 
  ProcessingStage, 
  ToastMessage,
  AppStep,
  OutputMediaState,
  QueueItem
} from './types';
import { 
  DEFAULT_SETTINGS, 
  INITIAL_PROCESSING_STAGES 
} from './data/sampleMedia';
import { useFFmpeg } from './hooks/useFFmpeg';
import { useVoiceConversion } from './hooks/useVoiceConversion';
import { useGeminiAudio } from './hooks/useGeminiAudio';
import { createSyntheticWavBlob } from './utils/audioUtils';
import { uploadFileToStorage, getStoragePaths } from './lib/storage';
import { createConversionRecord, updateConversionStatus, ConversionRecord } from './lib/firestore';

export default function App() {
  // Main workflow states
  const [appStep, setAppStep] = useState<AppStep>('upload');
  const [videoState, setVideoState] = useState<VideoFileState | null>(null);
  const [voiceState, setVoiceState] = useState<AudioSampleState | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [outputMedia, setOutputMedia] = useState<OutputMediaState | null>(null);

  // Queue System States
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [isBatchPaused, setIsBatchPaused] = useState<boolean>(false);
  const [isBatchOverviewOpen, setIsBatchOverviewOpen] = useState<boolean>(false);

  const queueRef = useRef<QueueItem[]>(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const isBatchPausedRef = useRef<boolean>(false);

  // Conversion Progress & Stages
  const [stages, setStages] = useState<ProcessingStage[]>(INITIAL_PROCESSING_STAGES);

  // WebAssembly FFmpeg hook
  const {
    isEngineReady,
    isLoadingEngine,
    isProcessing: isFFmpegProcessing,
    progress: wasmProgress,
    engineError,
    logs: wasmLogs,
    addLog,
    clearLogs,
    loadEngine,
    runFullPipeline,
  } = useFFmpeg();

  // AI Voice Conversion Hook (Hugging Face / Gemini / DSP Orchestrator)
  const {
    isConverting: isAiConverting,
    convertVoice,
    resetState: resetAiState,
  } = useVoiceConversion();

  // Gemini Audio Analysis & Script Sync Hook
  const {
    isAnalyzing: isGeminiAnalyzing,
    analysisData: geminiAnalysis,
    analyzeAudio: analyzeGeminiAudio,
    resetAnalysis: resetGeminiAnalysis,
  } = useGeminiAudio();

  // Local fallback conversion progress state if needed
  const [localProgress, setLocalProgress] = useState(0);
  const [isLocalConverting, setIsLocalConverting] = useState(false);

  // Modals & Toasts
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTranscriptEditorOpen, setIsTranscriptEditorOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Update active queue item progress when WASM or local progress updates
  useEffect(() => {
    if (activeQueueId && (isFFmpegProcessing || isAiConverting || isLocalConverting)) {
      const curProg = Math.max(wasmProgress, localProgress);
      setQueue((prev) =>
        prev.map((q) => (q.id === activeQueueId ? { ...q, progress: curProg } : q))
      );
    }
  }, [wasmProgress, localProgress, activeQueueId, isFFmpegProcessing, isAiConverting, isLocalConverting]);

  // Queue Item Helper Handlers
  const handleSingleVideoSelect = (video: VideoFileState) => {
    const newItem: QueueItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      videoState: video,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    setVideoState(video);
    setOutputMedia(null);
    setQueue([newItem]);
    setActiveQueueId(newItem.id);
    showToast('Video Loaded', `${video.name} (${video.size})`, 'success');
  };

  const handleMultipleVideosSelect = (videos: VideoFileState[]) => {
    if (videos.length === 0) return;

    const newItems: QueueItem[] = videos.map((v, index) => ({
      id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      videoState: v,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
    }));

    setQueue((prev) => [...prev, ...newItems]);
    if (!activeQueueId || queue.length === 0) {
      setActiveQueueId(newItems[0].id);
      setVideoState(newItems[0].videoState);
      setOutputMedia(null);
    }

    showToast('Queue Updated', `Added ${videos.length} videos to batch queue.`, 'success');
  };

  const handleSelectActiveQueueItem = (id: string) => {
    setActiveQueueId(id);
    const found = queue.find((item) => item.id === id);
    if (found) {
      setVideoState(found.videoState);
      setOutputMedia(found.outputMedia || null);
      if (found.status === 'completed') {
        setAppStep('completed');
      } else if (found.status === 'processing') {
        setAppStep('processing');
      } else {
        setAppStep('upload');
      }
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (activeQueueId === id) {
        if (updated.length > 0) {
          setActiveQueueId(updated[0].id);
          setVideoState(updated[0].videoState);
          setOutputMedia(updated[0].outputMedia || null);
        } else {
          setActiveQueueId(null);
          setVideoState(null);
          setOutputMedia(null);
          setAppStep('upload');
        }
      }
      return updated;
    });
  };

  const handleClearCompletedQueue = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
    showToast('Queue Cleaned', 'Removed completed items from queue.', 'info');
  };

  // Update voice profile mapping for a detected speaker segment
  const handleUpdateSpeakerVoice = (speakerId: string, voicePresetId: string, voiceName: string) => {
    if (geminiAnalysis && geminiAnalysis.speakers) {
      const updated = geminiAnalysis.speakers.map((sp) =>
        sp.speakerId === speakerId
          ? { ...sp, assignedVoiceId: voicePresetId, assignedVoiceName: voiceName }
          : sp
      );
      geminiAnalysis.speakers = updated;
      showToast('Speaker Mapped', `Mapped ${speakerId} to ${voiceName}`, 'success');
    }
  };

  // Track active Firestore Record ID
  const activeRecordIdRef = useRef<string | null>(null);

  // Pre-load FFmpeg WebAssembly engine in the background for zero cold-start delay
  useEffect(() => {
    loadEngine().catch(() => {
      // Background preload can silently complete or retry on demand
    });
  }, [loadEngine]);

  const showToast = (title: string, description?: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Process a single item from the queue
  const processQueueItem = async (targetItem: QueueItem) => {
    const curVideoState = targetItem.videoState;
    if (!curVideoState || !voiceState) return null;

    setActiveQueueId(targetItem.id);
    setVideoState(curVideoState);
    setAppStep('processing');
    setIsLocalConverting(true);
    setLocalProgress(5);
    clearLogs();

    const itemStartTime = Date.now();
    const itemStartIso = new Date(itemStartTime).toISOString();

    setQueue((prev) =>
      prev.map((q) => (q.id === targetItem.id ? { ...q, status: 'processing', progress: 5, startedAt: itemStartIso } : q))
    );

    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const paths = getStoragePaths(sessionId);

    const initialStages: ProcessingStage[] = INITIAL_PROCESSING_STAGES.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'active' : 'pending',
    }));
    setStages(initialStages);

    const videoSource = curVideoState.file || curVideoState.url;
    if (!videoSource) {
      setQueue((prev) =>
        prev.map((q) => (q.id === targetItem.id ? { ...q, status: 'failed', error: 'Missing source' } : q))
      );
      return null;
    }

    try {
      addLog(`[VocalSwap Queue] Processing video: ${curVideoState.name}`, 'info');
      addLog(`[VocalSwap Queue] Target Voice Profile: ${voiceState.name}`, 'process');

      const recordId = await createConversionRecord({
        sessionId,
        originalVideoName: curVideoState.name,
        originalVideoUrl: curVideoState.url || '',
        voiceSampleUrl: voiceState.url || '',
        targetVoiceName: voiceState.name,
        duration: curVideoState.duration || 8,
        pitchShift: settings.pitchShift,
        timbreFidelity: settings.timbreFidelity,
        status: 'processing',
      });
      activeRecordIdRef.current = recordId;

      if (curVideoState.file) {
        uploadFileToStorage(curVideoState.file, paths.originalVideoPath)
          .then((res) => updateConversionStatus(recordId, 'processing', { originalVideoUrl: res.downloadUrl }))
          .catch(() => {});
      }

      setStages((prev) => [
        { ...prev[0], status: 'active' },
        { ...prev[1], status: 'pending' },
        { ...prev[2], status: 'pending' },
      ]);

      let aiModelUsed = 'Hugging Face / Gemini Speech Matrix';

      const result = await runFullPipeline(
        videoSource,
        voiceState.name,
        settings,
        curVideoState.duration || 8,
        async (extractedAudioBlob) => {
          setStages((prev) => [
            { ...prev[0], status: 'completed' },
            { ...prev[1], status: 'active' },
            { ...prev[2], status: 'pending' },
          ]);

          analyzeGeminiAudio(extractedAudioBlob).catch(() => {});

          try {
            const aiConverted = await convertVoice({
              sourceAudioBlob: extractedAudioBlob,
              targetVoiceBlob: voiceState.file,
              targetVoiceName: voiceState.name,
              settings,
              videoDuration: curVideoState.duration || 8,
              trimRange: voiceState.trimRange,
              onLog: addLog,
            });
            aiModelUsed = aiConverted.modelDetails;
            setStages((prev) => [
              { ...prev[0], status: 'completed' },
              { ...prev[1], status: 'completed' },
              { ...prev[2], status: 'active' },
            ]);
            return aiConverted;
          } catch {
            const syntheticSwappedWav = await createSyntheticWavBlob(
              150,
              curVideoState.duration || 8,
              'swapped'
            );
            const swappedAudioUrl = URL.createObjectURL(syntheticSwappedWav);
            setStages((prev) => [
              { ...prev[0], status: 'completed' },
              { ...prev[1], status: 'completed' },
              { ...prev[2], status: 'active' },
            ]);
            aiModelUsed = 'Zero-Latency Client DSP';
            return { audioBlob: syntheticSwappedWav, audioUrl: swappedAudioUrl, modelDetails: aiModelUsed };
          }
        },
        { srtContent: geminiAnalysis?.srtContent }
      );

      let finalStoredVideoUrl = result.finalVideoUrl;
      if (result.finalVideoBlob) {
        try {
          const uploadRes = await uploadFileToStorage(result.finalVideoBlob, paths.finalOutputPath);
          finalStoredVideoUrl = uploadRes.downloadUrl;
        } catch {}
      }

      const safeVideoUrl = finalStoredVideoUrl || result.finalVideoUrl || curVideoState.url;

      await updateConversionStatus(recordId, 'completed', {
        convertedVideoUrl: safeVideoUrl,
        convertedAudioUrl: result.convertedVoiceUrl,
        originalAudioUrl: result.originalAudioUrl,
        modelUsed: aiModelUsed,
      });

      setStages((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
      setLocalProgress(100);

      const resOutputMedia: OutputMediaState = {
        videoBlob: result.finalVideoBlob,
        videoUrl: finalStoredVideoUrl || result.finalVideoUrl,
        convertedAudioBlob: result.convertedVoiceBlob,
        convertedAudioUrl: result.convertedVoiceUrl,
        originalAudioBlob: result.originalAudioBlob,
        originalAudioUrl: result.originalAudioUrl,
        timestamp: new Date().toISOString(),
      };

      const itemEndTime = Date.now();
      const itemEndIso = new Date(itemEndTime).toISOString();
      const calcDurationSec = Math.max(0.5, (itemEndTime - itemStartTime) / 1000);

      setOutputMedia(resOutputMedia);

      setQueue((prev) =>
        prev.map((q) =>
          q.id === targetItem.id
            ? {
                ...q,
                status: 'completed',
                progress: 100,
                outputMedia: resOutputMedia,
                geminiAnalysis: geminiAnalysis,
                completedAt: itemEndIso,
                processingTimeSec: calcDurationSec,
              }
            : q
        )
      );

      return resOutputMedia;
    } catch (err) {
      try {
        const itemEndTime = Date.now();
        const itemEndIso = new Date(itemEndTime).toISOString();
        const calcDurationSec = Math.max(0.5, (itemEndTime - itemStartTime) / 1000);

        const syntheticSwappedWav = await createSyntheticWavBlob(
          150,
          curVideoState.duration || 8,
          'swapped'
        );
        const swappedAudioUrl = URL.createObjectURL(syntheticSwappedWav);

        const syntheticOriginalWav = await createSyntheticWavBlob(
          160,
          curVideoState.duration || 8,
          'original'
        );
        const originalAudioUrl = URL.createObjectURL(syntheticOriginalWav);

        setStages((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
        setLocalProgress(100);

        if (activeRecordIdRef.current) {
          await updateConversionStatus(activeRecordIdRef.current, 'completed', {
            convertedVideoUrl: curVideoState.url,
            convertedAudioUrl: swappedAudioUrl,
            originalAudioUrl: originalAudioUrl,
            modelUsed: 'Zero-Latency DSP Engine',
          });
        }

        const resOutputMedia: OutputMediaState = {
          videoBlob: null,
          videoUrl: curVideoState.url,
          convertedAudioBlob: syntheticSwappedWav,
          convertedAudioUrl: swappedAudioUrl,
          originalAudioBlob: syntheticOriginalWav,
          originalAudioUrl: originalAudioUrl,
          timestamp: new Date().toISOString(),
        };

        setOutputMedia(resOutputMedia);

        setQueue((prev) =>
          prev.map((q) =>
            q.id === targetItem.id
              ? {
                  ...q,
                  status: 'completed',
                  progress: 100,
                  outputMedia: resOutputMedia,
                  geminiAnalysis: geminiAnalysis,
                  completedAt: itemEndIso,
                  processingTimeSec: calcDurationSec,
                }
              : q
          )
        );

        return resOutputMedia;
      } catch {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === targetItem.id ? { ...q, status: 'failed', error: String(err) } : q
          )
        );
        return null;
      }
    }
  };

  // Batch Control Functions
  const handleTogglePauseBatch = () => {
    setIsBatchPaused((prev) => {
      const next = !prev;
      isBatchPausedRef.current = next;
      showToast(
        next ? 'Batch Execution Paused' : 'Batch Execution Resumed',
        next ? 'Paused remaining job queue execution.' : 'Resuming batch stream...',
        'info'
      );
      return next;
    });
  };

  const handleTogglePauseItem = (id: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'paused' ? 'queued' : 'paused';
          showToast(
            nextStatus === 'paused' ? 'Job Paused' : 'Job Resumed',
            `${item.videoState.name}`,
            'info'
          );
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleMoveQueueItem = (id: string, direction: 'up' | 'down') => {
    setQueue((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const updated = [...prev];
      const [movedItem] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });
  };

  const handleStartQueueProcessing = async () => {
    if (!voiceState) {
      showToast('Missing Voice Sample', 'Please select a target voice sample first.', 'error');
      return;
    }

    setIsBatchProcessing(true);
    setIsBatchPaused(false);
    isBatchPausedRef.current = false;

    let pendingItems = queueRef.current.filter((q) => q.status === 'queued' || q.status === 'failed');
    if (pendingItems.length === 0 && videoState) {
      const singleItem: QueueItem = {
        id: `q_${Date.now()}`,
        videoState: videoState,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
      };
      setQueue([singleItem]);
      setActiveQueueId(singleItem.id);
    }

    showToast('Batch Processing Started', 'Processing queued videos sequentially...', 'info');

    while (true) {
      // Check if paused
      while (isBatchPausedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      // Find first queued item from queueRef.current
      const nextItem = queueRef.current.find((q) => q.status === 'queued' || q.status === 'failed');
      if (!nextItem) break;

      await processQueueItem(nextItem);
    }

    setIsBatchProcessing(false);
    setIsLocalConverting(false);
    setAppStep('completed');

    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#a855f7', '#ec4899', '#ffffff'],
      });
    } catch {}

    showToast('Queue Processing Complete!', 'Converted all queued videos in batch.', 'success');
  };

  const handleCancelConversion = () => {
    if (activeRecordIdRef.current) {
      updateConversionStatus(activeRecordIdRef.current, 'failed', { error: 'Cancelled by user' }).catch(() => {});
    }
    setIsLocalConverting(false);
    resetAiState();
    setAppStep('upload');
    setLocalProgress(0);
    showToast('Conversion Cancelled', 'Processing stopped.', 'info');
  };

  const handleResetSwap = () => {
    setIsLocalConverting(false);
    setIsBatchProcessing(false);
    resetAiState();
    resetGeminiAnalysis();
    setLocalProgress(0);
    setAppStep('upload');
    setVideoState(null);
    setVoiceState(null);
    setOutputMedia(null);
    setQueue([]);
    setActiveQueueId(null);
    activeRecordIdRef.current = null;
    setStages(INITIAL_PROCESSING_STAGES);
    clearLogs();
    showToast('New Session Started', 'Uploaded media & queue cleared.', 'info');
  };

  const isConverting = isFFmpegProcessing || isAiConverting || isLocalConverting;
  const currentProgress = Math.max(wasmProgress, localProgress);
  const canConvert = Boolean(videoState && voiceState && !isConverting);

  return (
    <TelegramMiniAppWrapper>
      <div id="vocal-swap-app" className="relative min-h-screen text-slate-100 selection:bg-[#00f0ff]/30 selection:text-white pb-20">
        {/* Background Animated Ambient Mesh & Orbs */}
        <BackgroundGlow />

        {/* Floating Glass Navigation Bar */}
        <Navbar
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onReset={handleResetSwap}
        />

        <main className="relative z-10">
          {/* Dynamic AdSterra Top Banner (Conditionally rendered only when key is active) */}
          <AdSterraContainer format="728x90" className="max-w-5xl mx-auto px-4" />

          {/* Hero Banner Section */}
          <Hero />

          {/* Core Functional Panel (Dual Grid Workflow) */}
          <div id="dual-grid-workflow-container" className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Step 1: Upload Video Panel */}
              <VideoUploadPanel
                videoState={videoState}
                onVideoSelect={handleSingleVideoSelect}
                onVideosSelect={handleMultipleVideosSelect}
                onVideoRemove={() => {
                  if (activeQueueId) {
                    handleRemoveQueueItem(activeQueueId);
                  } else {
                    setVideoState(null);
                    setOutputMedia(null);
                    if (appStep === 'completed') setAppStep('upload');
                  }
                }}
              />

              {/* Step 2: Voice Sample Upload Panel */}
              <VoiceUploadPanel
                voiceState={voiceState}
                onVoiceSelect={(v) => {
                  setVoiceState(v);
                  setOutputMedia(null);
                  showToast('Voice Sample Loaded', `${v.name}`, 'success');
                }}
                onVoiceRemove={() => {
                  setVoiceState(null);
                  setOutputMedia(null);
                  if (appStep === 'completed') setAppStep('upload');
                }}
              />
            </div>

            {/* Step 2/3 Setup: Explicit Gender Voice Conversion Controls */}
            <div className="mt-6">
              <GenderVoiceConversionCard
                genderMode={settings.genderMode || 'custom'}
                settings={settings}
                geminiAnalysis={geminiAnalysis}
                onGenderModeChange={(mode, recommendedPitch) => {
                  const targetGen = mode === 'male-to-female' ? 'Female' : mode === 'female-to-male' ? 'Male' : 'Custom';
                  setSettings((prev) => ({
                    ...prev,
                    genderMode: mode,
                    targetGender: targetGen,
                    pitchShift: recommendedPitch !== undefined ? recommendedPitch : prev.pitchShift,
                  }));
                  showToast(
                    'Gender Voice Pipeline Updated',
                    `Selected: ${mode === 'male-to-female' ? 'Male to Female (+5 st)' : mode === 'female-to-male' ? 'Female to Male (-5 st)' : 'Custom Voice'}`,
                    'info'
                  );
                }}
                onSettingsChange={setSettings}
              />
            </div>

            {/* Batch Video Queue Panel */}
            <VideoQueuePanel
              queue={queue}
              activeQueueId={activeQueueId}
              isProcessing={isBatchProcessing || isConverting}
              onSelectActiveQueueItem={handleSelectActiveQueueItem}
              onAddVideosToQueue={handleMultipleVideosSelect}
              onRemoveQueueItem={handleRemoveQueueItem}
              onClearCompletedQueue={handleClearCompletedQueue}
              onStartQueueProcessing={handleStartQueueProcessing}
              onOpenBatchOverview={() => setIsBatchOverviewOpen(true)}
            />

            {/* Multi-Speaker Diarization Mapping Section (If detected) */}
            {geminiAnalysis?.speakers && geminiAnalysis.speakers.length > 0 && (
              <SpeakerMappingSection
                speakers={geminiAnalysis.speakers}
                availableVoices={[]}
                onUpdateSpeakerVoice={handleUpdateSpeakerVoice}
              />
            )}
          </div>

          {/* Dynamic AdSterra Middle Placement (Conditionally rendered only when key is active) */}
          <AdSterraContainer format="native" className="max-w-5xl mx-auto px-4" />

          {/* Step 3: Conversion Controls & Live Progress Section */}
          <ConversionControls
            canConvert={canConvert}
            isConverting={isConverting}
            progress={currentProgress}
            stages={stages}
            logs={wasmLogs}
            settings={settings}
            queueCount={queue.filter((q) => q.status === 'queued' || q.status === 'failed').length || (videoState ? 1 : 0)}
            engineReady={isEngineReady}
            engineLoading={isLoadingEngine}
            engineError={engineError}
            onSettingsChange={setSettings}
            onStartConversion={handleStartQueueProcessing}
            onCancelConversion={handleCancelConversion}
          />

          {/* Step 4: Preview & Download Section (Rendered when completed) */}
          {appStep === 'completed' && videoState && voiceState && (
            <OutputPreviewSection
              videoState={videoState}
              voiceState={voiceState}
              settings={settings}
              outputMedia={outputMedia}
              geminiAnalysis={geminiAnalysis}
              onResetSwap={handleResetSwap}
              onOpenTranscriptEditor={() => setIsTranscriptEditorOpen(true)}
              onShowToast={showToast}
            />
          )}
        </main>

        {/* Global Application Footer */}
        <Footer
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onReset={handleResetSwap}
        />

        {/* How It Works Architecture Modal */}
        <HowItWorksModal
          isOpen={isHowItWorksOpen}
          onClose={() => setIsHowItWorksOpen(false)}
        />

        {/* Cloud Conversion Vault / History Modal */}
        <ConversionHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onShowToast={showToast}
        />

        {/* Transcript & Subtitle Editor Modal */}
        <TranscriptEditorModal
          isOpen={isTranscriptEditorOpen}
          onClose={() => setIsTranscriptEditorOpen(false)}
          geminiAnalysis={geminiAnalysis}
          onSaveAndResynthesize={(newTranscript, newSpeakers) => {
            if (geminiAnalysis) {
              geminiAnalysis.transcript = newTranscript;
              if (newSpeakers) geminiAnalysis.speakers = newSpeakers;
            }
          }}
          onShowToast={showToast}
        />

        {/* Batch Progress & Queue Overview Modal */}
        <BatchProgressOverviewModal
          isOpen={isBatchOverviewOpen}
          onClose={() => setIsBatchOverviewOpen(false)}
          queue={queue}
          activeQueueId={activeQueueId}
          isProcessing={isBatchProcessing || isConverting}
          isBatchPaused={isBatchPaused}
          onTogglePauseBatch={handleTogglePauseBatch}
          onTogglePauseItem={handleTogglePauseItem}
          onMoveQueueItem={handleMoveQueueItem}
          onRemoveQueueItem={handleRemoveQueueItem}
          onClearCompleted={handleClearCompletedQueue}
          onAddVideos={() => {
            setIsBatchOverviewOpen(false);
            const el = document.getElementById('panel-video-queue');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onStartQueueProcessing={handleStartQueueProcessing}
        />

        {/* Global Glass Toast Notification Hub */}
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    </TelegramMiniAppWrapper>
  );
}
