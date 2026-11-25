import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/services/api';

export const AiServiceStatusBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [serviceInfo, setServiceInfo] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await apiRequest<any>('/ai/health');
      const payload = res.data || res;
      const isLive = Boolean(
        res.success && (
          (res as any).connected === true ||
          payload.connected === true ||
          payload.status === 'healthy' ||
          payload.status === 'ONLINE' ||
          payload.data?.status === 'healthy'
        )
      );
      if (isLive) {
        setIsConnected(true);
        const version = payload.api_version || payload.data?.api_version;
        setServiceInfo(version ? `v${version}` : 'Active');
      } else {
        setIsConnected(false);
        setServiceInfo(null);
      }
    } catch {
      setIsConnected(false);
      setServiceInfo(null);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Periodic check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      type="button"
      onClick={checkStatus}
      title={
        isConnected
          ? `Python AI & Computer Vision Service is Connected (${serviceInfo || 'Active'}). Click to recheck.`
          : "Python AI Service is currently Offline. Start service on port 8001 with 'npm run dev:ai'. Click to retry."
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer ${className} ${
        isConnected
          ? 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100/70'
          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/70'
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isConnected ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
        )}
      </span>

      <Cpu className={`w-3.5 h-3.5 ${isConnected ? 'text-teal-600' : 'text-slate-400'} ${isChecking ? 'animate-spin' : ''}`} />
      <span className="font-mono text-[11px]">
        AI {isConnected ? 'Connected' : 'Offline'}
      </span>
      {serviceInfo && (
        <span className="text-[10px] text-teal-600 font-mono hidden lg:inline">
          ({serviceInfo})
        </span>
      )}
    </button>
  );
};
