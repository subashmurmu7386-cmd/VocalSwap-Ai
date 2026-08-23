import { VoicePreset, ConversionSettings, ProcessingStage } from '../types';

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'morgan-cinematic',
    name: 'Morgan Vance',
    category: 'Cinematic',
    gender: 'Male',
    avatar: '🎙️',
    sampleFrequency: 110,
    pitchShift: -3,
    timbreDescription: 'Resonant, authoritative, deep cinematic baritone with rich vocal fry',
    tags: ['Movie Trailer', 'Documentary', 'Deep Bass'],
    recommendedUse: 'Epic trailers, deep voiceovers, dramatic storytelling'
  },
  {
    id: 'aria-narrator',
    name: 'Aria Sterling',
    category: 'Narrator',
    gender: 'Female',
    avatar: '✨',
    sampleFrequency: 225,
    pitchShift: 2,
    timbreDescription: 'Crisp, articulate, polished studio narrator with luminous clarity',
    tags: ['Audiobook', 'Tech Explainer', 'Warm Studio'],
    recommendedUse: 'Product demos, tutorials, high-end commercial narration'
  },
  {
    id: 'marcus-podcast',
    name: 'Marcus Brody',
    category: 'Podcast',
    gender: 'Male',
    avatar: '📻',
    sampleFrequency: 145,
    pitchShift: -1,
    timbreDescription: 'Casual, charismatic, dynamic broadcast presence with natural cadence',
    tags: ['Podcast Host', 'Interview', 'Conversational'],
    recommendedUse: 'Vlogs, podcast swaps, casual video essays'
  },
  {
    id: 'nova-cyberpunk',
    name: 'Nova 09-X',
    category: 'Character',
    gender: 'Neutral',
    avatar: '⚡',
    sampleFrequency: 190,
    pitchShift: 1,
    timbreDescription: 'Slightly synthetic harmonic undertones with hyper-precise cadence',
    tags: ['Sci-Fi', 'AI Companion', 'Glitch Synth'],
    recommendedUse: 'Gaming clips, cyberpunk edits, futuristic commentary'
  },
  {
    id: 'elena-cinema',
    name: 'Elena Rostova',
    category: 'Celebrity Style',
    gender: 'Female',
    avatar: '🎭',
    sampleFrequency: 240,
    pitchShift: 3,
    timbreDescription: 'Expressive, dramatic, velvety contour with nuanced emotional breath',
    tags: ['Film Actor', 'Intense Drama', 'Expressive'],
    recommendedUse: 'Movie dialogues, acting scene voice replace'
  }
];

export const DEFAULT_SETTINGS: ConversionSettings = {
  model: 'neural-v3-ultra',
  genderMode: 'custom',
  targetGender: 'Custom',
  pitchShift: 0,
  voiceSpeed: 1.0,
  timbreFidelity: 95,
  preserveBackgroundMusic: true,
  backgroundMusicVolume: 80,
  lipSyncAccuracy: 'ultra',
  noiseReduction: true,
  autoNormalizeAudio: true,
  outputFormat: 'mp4-1080p'
};

export const INITIAL_PROCESSING_STAGES: ProcessingStage[] = [
  {
    id: 'stage-1',
    title: 'Extracting Audio & Demuxing Vocals',
    description: 'Separating dialogue frequencies from background score and ambient Foley sound.',
    progressRange: [0, 32],
    status: 'pending'
  },
  {
    id: 'stage-2',
    title: 'Neural Timbre Cloning & Pitch Modeling',
    description: 'Synthesizing voice harmonics, formant contours, and emotional prosody matching target sample.',
    progressRange: [33, 72],
    status: 'pending'
  },
  {
    id: 'stage-3',
    title: 'Harmonic Mastering & Frame Syncing',
    description: 'Multiplexing new 48kHz vocal track onto original video stream with zero phase jitter.',
    progressRange: [73, 100],
    status: 'pending'
  }
];

