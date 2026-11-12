import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export const DemoNoticeBadge: React.FC<{ label?: string }> = ({
  label = 'SIMULATED CLINICAL ENVIRONMENT • FICTIONAL DEMO DEMOGRAPHICS & TELEMETRY',
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside aria-label="Clinical Simulation Notice" className="bg-gradient-to-r from-blue-900 via-navy-950 to-blue-950 text-white border-b border-blue-800/40 py-1.5 px-4 text-center text-[11px] relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
        <ShieldAlert className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
        <span className="text-slate-200 tracking-wide font-medium">{label}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
        title="Dismiss banner"
      >
        <X className="w-3 h-3" />
      </button>
    </aside>
  );
};
