import React, { useRef, useEffect } from 'react';

interface VoicePreviewWaveformProps {
  analyser?: AnalyserNode | null;
  isPlaying?: boolean;
  gender?: string;
  className?: string;
  barCount?: number;
}

export const VoicePreviewWaveform: React.FC<VoicePreviewWaveformProps> = ({
  analyser,
  isPlaying = false,
  gender = 'Neutral',
  className = 'w-full h-12',
  barCount = 32,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    let frequencyData = new Uint8Array(128);
    let timeDomainData = new Uint8Array(128);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (isPlaying && analyser) {
        if (frequencyData.length !== analyser.frequencyBinCount) {
          frequencyData = new Uint8Array(analyser.frequencyBinCount);
        }
        if (timeDomainData.length !== analyser.fftSize) {
          timeDomainData = new Uint8Array(analyser.fftSize);
        }
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeDomainData);
      }

      // Determine accent colors based on gender profile
      let primaryColor = '#00f0ff'; // Cyan
      let secondaryColor = '#a855f7'; // Purple
      if (gender === 'Female') {
        primaryColor = '#ec4899'; // Pink
        secondaryColor = '#a855f7';
      } else if (gender === 'Male') {
        primaryColor = '#00f0ff'; // Cyan
        secondaryColor = '#3b82f6'; // Blue
      }

      const totalBars = barCount;
      const barGap = 3;
      const barWidth = Math.max(2, (width - (totalBars - 1) * barGap) / totalBars);
      const centerY = height / 2;

      for (let i = 0; i < totalBars; i++) {
        let barHeight = 4; // Base resting height

        if (isPlaying && analyser) {
          // Map bin index across frequency data
          const binIndex = Math.floor((i / totalBars) * (frequencyData.length * 0.6));
          const freqVal = frequencyData[binIndex] || 0;
          const normFreq = freqVal / 255;

          // Also sample time-domain wave for organic voice movement
          const timeIndex = Math.floor((i / totalBars) * timeDomainData.length);
          const timeVal = Math.abs((timeDomainData[timeIndex] || 128) - 128) / 128;

          const combinedIntensity = Math.max(normFreq, timeVal * 1.5);
          barHeight = Math.max(4, combinedIntensity * (height - 8));
        } else {
          // Idle ambient sine wave pulse pattern
          const time = Date.now() * 0.002;
          const sine = Math.sin(i * 0.25 + time) * 0.5 + 0.5;
          const envelope = Math.sin((i / totalBars) * Math.PI); // Arc in center
          barHeight = 4 + sine * 8 * envelope;
        }

        const x = i * (barWidth + barGap);
        const yTop = centerY - barHeight / 2;

        // Gradient for bars
        const gradient = ctx.createLinearGradient(0, yTop, 0, yTop + barHeight);
        if (isPlaying) {
          gradient.addColorStop(0, primaryColor);
          gradient.addColorStop(0.5, secondaryColor);
          gradient.addColorStop(1, primaryColor);
        } else {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, yTop, barWidth, barHeight, [barWidth / 2]);
        } else {
          ctx.rect(x, yTop, barWidth, barHeight);
        }
        ctx.fill();

        // Glow effect when active
        if (isPlaying) {
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 6;
        } else {
          ctx.shadowBlur = 0;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [analyser, isPlaying, gender, barCount]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-950/80 border border-white/10 ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
      {isPlaying && (
        <div className="absolute top-1 right-2 flex items-center gap-1.5 text-[9px] font-mono text-cyan-300 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Real-Time Web Audio FFT</span>
        </div>
      )}
    </div>
  );
};
