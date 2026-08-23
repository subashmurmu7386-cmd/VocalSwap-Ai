import React, { useEffect, useRef } from 'react';

export interface AdSterraContainerProps {
  /**
   * Optional custom AdSterra placement key.
   * Defaults to NEXT_PUBLIC_ADSTERRA_KEY or VITE_ADSTERRA_KEY environment variables.
   */
  adKey?: string;
  /**
   * Ad dimension format.
   * Defaults to '728x90'.
   */
  format?: '728x90' | '320x50' | '468x60' | '300x250' | '160x600' | 'native';
  /**
   * Optional container CSS classes.
   */
  className?: string;
}

const DIMENSION_MAP: Record<string, { width: number; height: number }> = {
  '728x90': { width: 728, height: 90 },
  '320x50': { width: 320, height: 50 },
  '468x60': { width: 468, height: 60 },
  '300x250': { width: 300, height: 250 },
  '160x600': { width: 160, height: 600 },
  'native': { width: 728, height: 90 },
};

/**
 * Clean, production-ready AdSterra dynamic ad container.
 * 
 * - Strictly returns null if no valid key is provided (Zero UI clutter / zero dummy mocks).
 * - Client-safe dynamic script injection with deduplication and unmount cleanup.
 */
export const AdSterraContainer: React.FC<AdSterraContainerProps> = ({
  adKey,
  format = '728x90',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoadedRef = useRef(false);

  // Resolve key safely across Next.js (process.env) and Vite (import.meta.env)
  const resolvedKey =
    adKey ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ADSTERRA_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.NEXT_PUBLIC_ADSTERRA_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ADSTERRA_KEY) ||
    '';

  useEffect(() => {
    // If no key is set or already injected, do nothing
    if (!resolvedKey || isLoadedRef.current || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const { width, height } = DIMENSION_MAP[format] || { width: 728, height: 90 };

    try {
      // 1. Configure AdSterra options script
      const configScript = document.createElement('script');
      configScript.type = 'text/javascript';
      configScript.innerHTML = `
        atOptions = {
          'key' : '${resolvedKey}',
          'format' : 'iframe',
          'height' : ${height},
          'width' : ${width},
          'params' : {}
        };
      `;

      // 2. Load AdSterra invoke script
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = `//www.highperformanceformat.com/${resolvedKey}/invoke.js`;
      invokeScript.async = true;

      container.appendChild(configScript);
      container.appendChild(invokeScript);
      isLoadedRef.current = true;

      return () => {
        // Cleanup scripts on component unmount
        if (container) {
          container.innerHTML = '';
        }
        isLoadedRef.current = false;
      };
    } catch {
      // Fail silently without disrupting parent application
    }
  }, [resolvedKey, format]);

  // Requirement: If key is not defined or is empty, return null with ZERO DOM elements or wrappers.
  if (!resolvedKey || resolvedKey.trim() === '') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      id={`adsterra-slot-${resolvedKey}`}
      className={`flex items-center justify-center overflow-hidden my-4 ${className}`}
    />
  );
};

export default AdSterraContainer;
