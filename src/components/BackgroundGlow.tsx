import React from 'react';

export const BackgroundGlow: React.FC = () => {
  return (
    <div id="ambient-backdrop" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Deep Dark Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090D16] via-[#070913] to-[#04050a]" />

      {/* Subtle Matrix Grid Texture */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Glowing Ambient Orb 1 - Electric Cyan (Top-Left / Center) */}
      <div 
        className="absolute -top-[12%] -left-[10%] w-[580px] h-[580px] sm:w-[720px] sm:h-[720px] rounded-full bg-[#00f0ff]/15 blur-[120px] animate-orb-1 mix-blend-screen"
      />

      {/* Glowing Ambient Orb 2 - Neon Purple (Top-Right / Mid) */}
      <div 
        className="absolute top-[20%] -right-[12%] w-[520px] h-[520px] sm:w-[680px] sm:h-[680px] rounded-full bg-[#a855f7]/18 blur-[140px] animate-orb-2 mix-blend-screen"
      />

      {/* Glowing Ambient Orb 3 - Vivid Violet / Magenta (Bottom-Center) */}
      <div 
        className="absolute -bottom-[15%] left-[25%] w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full bg-[#ec4899]/12 blur-[150px] animate-orb-3 mix-blend-screen"
      />

      {/* Deep Indigo Core Anchor Orb */}
      <div 
        className="absolute top-[45%] left-[40%] w-[400px] h-[400px] rounded-full bg-[#4338ca]/15 blur-[130px] animate-pulse-border mix-blend-screen opacity-50"
      />

      {/* Top light beam sheen */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff]/30 to-transparent" />
    </div>
  );
};
