import React from 'react';
import { Users, Mic, Upload, Check, Sparkles, Volume2 } from 'lucide-react';
import { SpeakerSegment, VoicePreset } from '../types';

interface SpeakerMappingSectionProps {
  speakers: SpeakerSegment[];
  availableVoices: VoicePreset[];
  onUpdateSpeakerVoice: (speakerId: string, voicePresetId: string, voiceName: string) => void;
  onUploadCustomSpeakerVoice?: (speakerId: string, file: File) => void;
}

export const SpeakerMappingSection: React.FC<SpeakerMappingSectionProps> = ({
  speakers,
  availableVoices,
  onUpdateSpeakerVoice,
  onUploadCustomSpeakerVoice,
}) => {
  if (!speakers || speakers.length === 0) return null;

  return (
    <div 
      id="section-multi-speaker-diarization"
      className="mt-6 p-5 sm:p-6 rounded-3xl glass-panel border border-[#00f0ff]/30 shadow-xl space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Multi-Speaker Diarization & Voice Mapping</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {speakers.length} {speakers.length === 1 ? 'Speaker' : 'Speakers'} Detected
              </span>
            </h4>
            <p className="text-xs text-slate-300">
              Assign distinct target neural voices or upload custom samples for each speaker in the video
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {speakers.map((speaker, index) => (
          <div
            key={speaker.speakerId + index}
            className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 hover:border-purple-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-xs flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <span className="text-xs font-bold text-white">
                  {speaker.speakerName || speaker.speakerId}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {speaker.start.toFixed(1)}s - {speaker.end.toFixed(1)}s
              </span>
            </div>

            {/* Spoken Dialogue Snippet */}
            <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-xl border border-white/5 line-clamp-2">
              "{speaker.text}"
            </p>

            {/* Voice Assign Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Target Neural Voice Profile:</span>
                <span className="text-cyan-300 font-mono text-[10px]">
                  {speaker.assignedVoiceName || 'Default Clone'}
                </span>
              </label>

              <select
                value={speaker.assignedVoiceId || ''}
                onChange={(e) => {
                  const selected = availableVoices.find((v) => v.id === e.target.value);
                  if (selected) {
                    onUpdateSpeakerVoice(speaker.speakerId, selected.id, selected.name);
                  }
                }}
                className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
              >
                <option value="">Default Target Voice Profile</option>
                {availableVoices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender} • {voice.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Custom Audio Sample File Upload for this Speaker */}
            {onUploadCustomSpeakerVoice && (
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <label className="cursor-pointer text-purple-300 hover:text-purple-200 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Speaker Audio Sample</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        onUploadCustomSpeakerVoice(speaker.speakerId, e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {speaker.customVoiceUrl && (
                  <span className="text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> Sample Ready
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
