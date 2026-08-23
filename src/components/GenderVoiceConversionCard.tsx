import React from 'react';
import { 
  UserCheck, 
  ArrowRightLeft, 
  Zap, 
  Sparkles, 
  Mic, 
  Sliders, 
  Volume2, 
  Activity,
  Check,
  ShieldAlert
} from 'lucide-react';
import { GenderConversionMode, ConversionSettings, GeminiAudioAnalysis } from '../types';
import { AudioSpectrogramVisualizer } from './AudioSpectrogramVisualizer';

interface GenderVoiceConversionCardProps {
  genderMode: GenderConversionMode;
  settings: ConversionSettings;
  geminiAnalysis?: GeminiAudioAnalysis | null;
  onGenderModeChange: (mode: GenderConversionMode, recommendedPitch?: number) => void;
  onSettingsChange: (settings: ConversionSettings) => void;
}

export const GenderVoiceConversionCard: React.FC<GenderVoiceConversionCardProps> = ({
  genderMode,
  settings,
  geminiAnalysis,
  onGenderModeChange,
  onSettingsChange,
}) => {
  const detectedGender = geminiAnalysis?.detectedGender || 'Male';

  const handleModeSelect = (mode: GenderConversionMode) => {
    let pitch = 0;
    if (mode === 'male-to-female') {
      pitch = 5; // +5 semitones default
    } else if (mode === 'female-to-male') {
      pitch = -5; // -5 semitones default
    } else {
      pitch = 0;
    }

    onGenderModeChange(mode, pitch);
    onSettingsChange({
      ...settings,
      genderMode: mode,
      targetGender: mode === 'male-to-female' ? 'Female' : mode === 'female-to-male' ? 'Male' : 'Custom',
      pitchShift: pitch,
    });
  };

  const handlePitchQuickAdjust = (semitones: number) => {
    onSettingsChange({
      ...settings,
      pitchShift: semitones,
    });
  };

  return (
    <div 
      id="panel-gender-voice-conversion"
      className="rounded-2xl glass-panel p-5 border border-white/10 shadow-xl space-y-4 transition-all duration-300 relative overflow-hidden"
    >
      {/* Top Header & Detected Audio Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00f0ff]/20 via-[#a855f7]/20 to-[#ec4899]/20 border border-white/15 flex items-center justify-center text-[#00f0ff]">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Gender Voice Swap Pipeline
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                AI Pitch & Formant
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Select gender transformation direction before synthesizing audio
            </p>
          </div>
        </div>

        {/* Gemini Source Gender Badge */}
        {geminiAnalysis && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-white/10 text-[11px] font-mono text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Detected Source:</span>
            <span className="font-bold text-white px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {detectedGender}
            </span>
          </div>
        )}
      </div>

      {/* Target Gender Selection Grid (3 Options) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Option 1: Male to Female */}
        <button
          type="button"
          id="btn-gender-male-to-female"
          onClick={() => handleModeSelect('male-to-female')}
          className={`p-3.5 rounded-xl text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
            genderMode === 'male-to-female'
              ? 'bg-gradient-to-br from-[#ec4899]/20 via-purple-900/40 to-slate-950 border-2 border-[#ec4899] shadow-lg shadow-[#ec4899]/20 text-white'
              : 'glass-panel-subtle hover:bg-white/5 border border-white/10 text-slate-300'
          }`}
        >
          {genderMode === 'male-to-female' && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ec4899] flex items-center justify-center text-white text-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">👨 ➔ 👩</span>
            <div>
              <div className="text-xs font-bold text-white">Male to Female</div>
              <div className="text-[10px] text-pink-300 font-mono">Natural Female Profile</div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
            Formant shift upward (+5 st) & acoustic resonance softening.
          </p>
        </button>

        {/* Option 2: Female to Male */}
        <button
          type="button"
          id="btn-gender-female-to-male"
          onClick={() => handleModeSelect('female-to-male')}
          className={`p-3.5 rounded-xl text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
            genderMode === 'female-to-male'
              ? 'bg-gradient-to-br from-[#00f0ff]/20 via-blue-950/40 to-slate-950 border-2 border-[#00f0ff] shadow-lg shadow-[#00f0ff]/20 text-white'
              : 'glass-panel-subtle hover:bg-white/5 border border-white/10 text-slate-300'
          }`}
        >
          {genderMode === 'female-to-male' && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#00f0ff] flex items-center justify-center text-slate-950 text-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">👩 ➔ 👨</span>
            <div>
              <div className="text-xs font-bold text-white">Female to Male</div>
              <div className="text-[10px] text-cyan-300 font-mono">Deep Male Profile</div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
            Formant shift downward (-5 st) & deep chest baritone.
          </p>
        </button>

        {/* Option 3: Custom Uploaded Voice */}
        <button
          type="button"
          id="btn-gender-custom-voice"
          onClick={() => handleModeSelect('custom')}
          className={`p-3.5 rounded-xl text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
            genderMode === 'custom'
              ? 'bg-gradient-to-br from-[#a855f7]/20 via-purple-950/40 to-slate-950 border-2 border-[#a855f7] shadow-lg shadow-[#a855f7]/20 text-white'
              : 'glass-panel-subtle hover:bg-white/5 border border-white/10 text-slate-300'
          }`}
        >
          {genderMode === 'custom' && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#a855f7] flex items-center justify-center text-white text-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎙️</span>
            <div>
              <div className="text-xs font-bold text-white">Custom Voice</div>
              <div className="text-[10px] text-purple-300 font-mono">User Reference Sample</div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
            Clones pitch, timbre & cadence directly from uploaded audio.
          </p>
        </button>
      </div>

      {/* Dynamic Pitch Preset Quick-Toggles & Fine Adjustment */}
      {genderMode !== 'custom' && (
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Pitch Preset Shift:</span>
              <strong className={genderMode === 'male-to-female' ? 'text-pink-300' : 'text-cyan-300'}>
                {settings.pitchShift > 0 ? `+${settings.pitchShift}` : settings.pitchShift} Semitones
              </strong>
            </span>
            <span className="text-[10px] text-slate-400">
              Formant: {genderMode === 'male-to-female' ? 'Acoustic Shift Up' : 'Acoustic Shift Down'}
            </span>
          </div>

          {/* Preset Buttons (+4, +5, +6 for Male->Female) or (-4, -5, -6 for Female->Male) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Quick Toggles:</span>
            {genderMode === 'male-to-female' ? (
              [4, 5, 6].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handlePitchQuickAdjust(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    settings.pitchShift === st
                      ? 'bg-pink-500/30 text-pink-200 border border-pink-400 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  +{st} st
                </button>
              ))
            ) : (
              [-4, -5, -6].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handlePitchQuickAdjust(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    settings.pitchShift === st
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {st} st
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Real-time Frequency Spectrogram Pipeline Feedback */}
      <div className="pt-2">
        <AudioSpectrogramVisualizer
          genderMode={genderMode}
          pitchShift={settings.pitchShift}
          activeTrack="swapped"
          title="Frequency Spectrogram Pipeline Monitor"
          subtitle={`Simulating ${genderMode === 'male-to-female' ? 'Male ➔ Female (+5 st)' : genderMode === 'female-to-male' ? 'Female ➔ Male (-5 st)' : 'Custom Reference'} acoustic spectral density & formant profile`}
        />
      </div>
    </div>
  );
};
