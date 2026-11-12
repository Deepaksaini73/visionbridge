import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const NetworkStatusBadge: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        isOnline
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
      }`}
      title={isOnline ? 'System is online. Real-time sync enabled.' : 'Operating offline. Data stored safely in browser IndexedDB.'}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-700" />
          <span>Offline Ready</span>
        </>
      )}
    </div>
  );
};

