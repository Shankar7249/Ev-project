import React, { useState, useEffect } from 'react';
import { WifiOff, Zap } from 'lucide-react';

export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-slate-900/95 text-white border border-slate-700/80 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 z-[9999] text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
      <WifiOff size={15} className="text-amber-400" />
      <span>Offline Mode: Using Local Kolhapur Map & EV Data</span>
    </div>
  );
};
