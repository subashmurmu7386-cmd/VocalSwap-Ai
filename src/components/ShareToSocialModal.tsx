import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Film, 
  Scissors, 
  Code, 
  ExternalLink, 
  Loader2, 
  Play, 
  Volume2,
  CheckCircle2,
  Send
} from 'lucide-react';
import { generateShortSummaryClip } from '../utils/ffmpegClient';

interface ShareToSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSource: File | Blob | string | null;
  audioSource: File | Blob | string | null;
  voiceName: string;
  transcript?: string;
  videoDuration?: number;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const ShareToSocialModal: React.FC<ShareToSocialModalProps> = ({
  isOpen,
  onClose,
  videoSource,
  audioSource,
  voiceName,
  transcript,
  videoDuration = 10,
  onShowToast,
}) => {
  const [clipDuration, setClipDuration] = useState<number>(10);
  const [startTime, setStartTime] = useState<number>(0);
  const [isGeneratingClip, setIsGeneratingClip] = useState<boolean>(false);
  const [clipProgress, setClipProgress] = useState<number>(0);
  
  const [summaryClipUrl, setSummaryClipUrl] = useState<string | null>(null);
  const [summaryClipBlob, setSummaryClipBlob] = useState<Blob | null>(null);

  const [postCaption, setPostCaption] = useState<string>('');
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);

  // Initialize post caption template
  useEffect(() => {
    if (isOpen) {
      const shareText = `Check out my video voice-swapped with VocalSwap AI using the "${voiceName}" neural voice profile! 🎙️✨\n\n${
        transcript ? `"${transcript.substring(0, 100)}..."\n\n` : ''
      }#VocalSwap #AIVoice #VoiceCloning #NeuralAudio #VocalAI`;
      setPostCaption(shareText);
    }
  }, [isOpen, voiceName, transcript]);

  if (!isOpen) return null;

  const appShareUrl = typeof window !== 'undefined' ? window.location.href : 'https://vocalswap.ai';

  const handleGenerateSummaryClip = async () => {
    if (!videoSource) {
      onShowToast('Missing Video Source', 'Please load a video to generate a summary clip.', 'error');
      return;
    }

    setIsGeneratingClip(true);
    setClipProgress(10);

    try {
      const sourceAudio = audioSource || videoSource;
      const result = await generateShortSummaryClip(
        videoSource,
        sourceAudio,
        startTime,
        clipDuration,
        (prog) => setClipProgress(Math.max(15, Math.min(95, prog))),
        (msg) => console.log('[SummaryClip]', msg)
      );

      setSummaryClipBlob(result.summaryBlob);
      setSummaryClipUrl(result.summaryUrl);
      setClipProgress(100);
      setIsGeneratingClip(false);

      onShowToast(
        'Teaser Clip Ready!',
        `Generated ${clipDuration}s short summary clip (${(result.summaryBlob.size / (1024 * 1024)).toFixed(2)} MB)`,
        'success'
      );
    } catch (err: unknown) {
      setIsGeneratingClip(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      onShowToast('Clip Generation Error', errMsg, 'error');
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(postCaption);
    setCopiedCaption(true);
    onShowToast('Caption Copied!', 'Post text and hashtags copied to clipboard.', 'success');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(appShareUrl);
    setCopiedLink(true);
    onShowToast('Link Copied!', 'Deep-link copied to clipboard.', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmbedCode = () => {
    const embedHtml = `<iframe src="${appShareUrl}" width="640" height="360" frameborder="0" allowfullscreen title="VocalSwap AI Video"></iframe>`;
    navigator.clipboard.writeText(embedHtml);
    setCopiedEmbed(true);
    onShowToast('Embed Code Copied!', 'HTML iframe snippet ready for your blog or website.', 'success');
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const handleDownloadTeaserClip = () => {
    if (!summaryClipUrl) return;
    const a = document.createElement('a');
    a.href = summaryClipUrl;
    a.download = `VocalSwap_Teaser_${voiceName.replace(/\s+/g, '_')}_${clipDuration}s.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast('Download Started', 'Saved short summary teaser clip.', 'success');
  };

  const handleNativeWebShare = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: 'VocalSwap AI Video',
          text: postCaption,
          url: appShareUrl,
        };

        if (summaryClipBlob && navigator.canShare && navigator.canShare({ files: [new File([summaryClipBlob], 'teaser.mp4', { type: 'video/mp4' })] })) {
          const file = new File([summaryClipBlob], `VocalSwap_${voiceName.replace(/\s+/g, '_')}_Teaser.mp4`, { type: 'video/mp4' });
          shareData.files = [file];
        }

        await navigator.share(shareData);
        onShowToast('Shared Successfully', 'Shared via system dialog.', 'success');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Native share error:', err);
        }
      }
    } else {
      handleCopyShareLink();
    }
  };

  // Social Deep-Link Launchers
  const shareLinks = [
    {
      name: 'X / Twitter',
      color: 'bg-black hover:bg-slate-900 border-white/20 text-white',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(postCaption)}&url=${encodeURIComponent(appShareUrl)}`,
    },
    {
      name: 'LinkedIn',
      color: 'bg-[#0077b5]/20 hover:bg-[#0077b5]/30 border-[#0077b5]/50 text-[#0077b5]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
        </svg>
      ),
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appShareUrl)}`,
    },
    {
      name: 'Facebook',
      color: 'bg-[#1877f2]/20 hover:bg-[#1877f2]/30 border-[#1877f2]/50 text-[#1877f2]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appShareUrl)}`,
    },
    {
      name: 'Reddit',
      color: 'bg-[#ff4500]/20 hover:bg-[#ff4500]/30 border-[#ff4500]/50 text-[#ff4500]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.562-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
      ),
      url: `https://www.reddit.com/submit?url=${encodeURIComponent(appShareUrl)}&title=${encodeURIComponent(`Voice-swapped video created with VocalSwap AI (${voiceName})`)}`,
    },
    {
      name: 'WhatsApp',
      color: 'bg-[#25d366]/20 hover:bg-[#25d366]/30 border-[#25d366]/50 text-[#25d366]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.8 14.12c-.24.68-1.2 1.25-1.93 1.32-.5.05-1.15.09-3.32-.8-2.78-1.15-4.57-3.98-4.71-4.17-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07 1-2.35.26-.28.58-.35.77-.35.19 0 .38.01.55.01.18.01.43-.07.67.52.24.59.83 2.03.9 2.18.07.15.12.33.02.53-.1.2-.15.33-.3.51-.15.18-.31.4-.44.54-.15.15-.3.32-.13.62.17.3.77 1.27 1.66 2.06 1.14 1.01 2.1 1.33 2.4 1.48.3.15.48.13.66-.07.18-.2.77-.9 1-.19.23-.29.38-.2.53-.09.15.38 2.03 1.26 2.14.88.11.19.16.32.16.51 0 .68-.56 1.37-.8 2.05z"/>
        </svg>
      ),
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${postCaption}\n${appShareUrl}`)}`,
    },
    {
      name: 'Telegram',
      color: 'bg-[#229ed9]/20 hover:bg-[#229ed9]/30 border-[#229ed9]/50 text-[#229ed9]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-2.01 9.47c-.15.68-.55.84-1.12.52l-3.08-2.27-1.49 1.43c-.16.16-.3.3-.62.3l.22-3.13 5.69-5.14c.25-.22-.05-.34-.38-.12l-7.03 4.43-3.04-.95c-.66-.21-.67-.66.14-.98l11.89-4.58c.55-.2 1.03.13.83.98z"/>
        </svg>
      ),
      url: `https://t.me/share/url?url=${encodeURIComponent(appShareUrl)}&text=${encodeURIComponent(postCaption)}`,
    },
  ];

  return (
    <div 
      id="modal-share-to-social"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="relative w-full max-w-2xl rounded-3xl glass-panel p-6 sm:p-8 border border-[#00f0ff]/40 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient glow line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00f0ff] to-[#a855f7] p-[1px] shadow-lg shadow-[#00f0ff]/20">
              <div className="w-full h-full rounded-[15px] bg-slate-950/80 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-[#00f0ff]" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Share & Publish to Social</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 font-semibold">
                  Branded Teaser
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Generate a short highlight teaser clip and publish directly to major platforms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="mt-6 space-y-6">
          {/* Section 1: Teaser Summary Clip Generator */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-[#00f0ff]" />
                <span>1. Generate Short Summary Clip</span>
              </label>

              {/* Duration selector buttons */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
                {[5, 10, 15].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setClipDuration(dur)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      clipDuration === dur
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {dur}s Teaser
                  </button>
                ))}
              </div>
            </div>

            {/* Start Time Offset Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Clip Start Offset: {startTime.toFixed(1)}s</span>
                <span>Max Duration: {videoDuration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, videoDuration - clipDuration)}
                step={0.5}
                value={startTime}
                onChange={(e) => setStartTime(parseFloat(e.target.value))}
                className="w-full accent-[#00f0ff] bg-slate-800 rounded-lg h-2 cursor-pointer"
              />
            </div>

            {/* Action Button & Video Preview Player */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateSummaryClip}
                disabled={isGeneratingClip}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#00f0ff]/30 via-[#a855f7]/30 to-[#ec4899]/30 hover:from-[#00f0ff]/40 hover:via-[#a855f7]/40 hover:to-[#ec4899]/40 border border-[#00f0ff]/40 shadow-lg shadow-[#00f0ff]/15 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingClip ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#00f0ff] animate-spin" />
                    <span>Cutting {clipDuration}s Teaser ({Math.round(clipProgress)}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                    <span>{summaryClipUrl ? 'Re-generate Teaser Clip' : 'Generate Teaser Clip'}</span>
                  </>
                )}
              </button>

              {summaryClipUrl && (
                <button
                  type="button"
                  onClick={handleDownloadTeaserClip}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save .MP4 Clip</span>
                </button>
              )}
            </div>

            {/* Teaser Video Preview Player with Brand Watermark Badge */}
            {summaryClipUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-[#00f0ff]/40 bg-black aspect-video shadow-xl group">
                <video
                  src={summaryClipUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />

                {/* Overlaid Brand Watermark Badge */}
                <div className="absolute top-3 right-3 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-[#00f0ff]/40 text-white shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
                  <span className="text-[10px] font-black tracking-wider text-[#00f0ff]">VOCALSWAAP.AI</span>
                  <span className="text-[9px] text-slate-300 border-l border-white/20 pl-1.5 font-mono">
                    {voiceName}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Direct Social Platform Deep-Links */}
          <div>
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-2.5">
              <Share2 className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>2. Direct Platform Deep-Links</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {shareLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] ${item.color}`}
                >
                  <div className="p-1.5 rounded-lg bg-black/40">{item.icon}</div>
                  <span className="text-xs font-bold">{item.name}</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
                </a>
              ))}
            </div>

            {/* Mobile Native Web Share Button */}
            <button
              type="button"
              onClick={handleNativeWebShare}
              className="mt-3 w-full p-3 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 hover:from-cyan-500/30 hover:via-purple-500/30 hover:to-pink-500/30 border border-cyan-400/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Send className="w-4 h-4 text-cyan-300" />
              <span>Native Mobile Share (System Apps & File Attachment)</span>
            </button>
          </div>

          {/* Section 3: Caption & Hashtags Generator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>3. Pre-Formatted Social Caption</span>
              </label>

              <button
                type="button"
                onClick={handleCopyCaption}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors"
              >
                {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCaption ? 'Copied' : 'Copy Caption'}</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              className="w-full p-3 rounded-2xl bg-black/60 border border-white/10 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-[#00f0ff]/50 transition-colors"
              placeholder="Write a custom caption for your social post..."
            />
          </div>

          {/* Section 4: Copy Share Link & Embed Code */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#00f0ff]" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Share Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyEmbedCode}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-[#a855f7]" />}
                <span>{copiedEmbed ? 'Embed Copied' : 'Copy HTML Embed Code'}</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Public Deep-Link Ready</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
