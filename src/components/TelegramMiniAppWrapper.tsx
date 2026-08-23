import React, { useEffect, useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        initDataUnsafe?: {
          user?: TelegramUser;
        };
        MainButton?: {
          text: string;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
        };
      };
    };
  }
}

export const TelegramMiniAppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTelegramApp, setIsTelegramApp] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#020617');
        tg.setBackgroundColor('#020617');
        setIsTelegramApp(true);

        if (tg.initDataUnsafe?.user) {
          setTelegramUser(tg.initDataUnsafe.user);
        }
      } catch (err) {
        console.warn('[Telegram WebApp] Init warning:', err);
      }
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Telegram Mini App Top Identity Banner (if opened inside Telegram) */}
      {isTelegramApp && (
        <div className="bg-gradient-to-r from-[#229ed9]/20 via-[#00f0ff]/10 to-purple-500/20 border-b border-[#229ed9]/30 py-2 px-4 text-xs font-mono text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#229ed9] animate-bounce" />
            <span>VocalSwap AI • Telegram Mini App Edition</span>
          </div>

          {telegramUser && (
            <div className="flex items-center gap-1.5 text-slate-200 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Hi, @{telegramUser.username || telegramUser.first_name}
              </span>
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
