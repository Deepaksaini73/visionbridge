import React from 'react';

interface ScreeningStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const ScreeningStatusBadge: React.FC<ScreeningStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'COMPLETED':
      case 'VALID_CALIBRATED':
      case 'NORMAL':
      case 'NORMAL_TRICHROMAT':
      case 'NO_DISTORTION':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
      case 'PRELIMINARY_UNCALIBRATED':
      case 'PENDING_REVIEW':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SKIPPED':
      case 'INCOMPLETE':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'INVALID_CONDITIONS':
      case 'INCONCLUSIVE':
      case 'WAVY_LINES':
      case 'MISSING_AREAS':
      case 'MODERATE_REDUCTION':
      case 'SEVERE_REDUCTION':
      case 'RED_GREEN_DEFICIENCY_SUSPECTED':
      case 'TOTAL_DEFICIENCY_SUSPECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'COMPLETED': return 'Completed';
      case 'IN_PROGRESS': return 'In Progress';
      case 'SKIPPED': return 'Skipped';
      case 'INCOMPLETE': return 'Incomplete';
      case 'VALID_CALIBRATED': return 'Calibrated Display';
      case 'PRELIMINARY_UNCALIBRATED': return 'Preliminary (Uncalibrated)';
      case 'INVALID_CONDITIONS': return 'Suboptimal Lighting';
      case 'PENDING_REVIEW': return 'Pending Review';
      case 'REVIEWED': return 'Clinically Reviewed';
      case 'NORMAL_TRICHROMAT': return 'Normal Trichromat';
      case 'RED_GREEN_DEFICIENCY_SUSPECTED': return 'Red-Green Deficiency Suspected';
      case 'NO_DISTORTION': return 'No Grid Distortion';
      case 'WAVY_LINES': return 'Wavy Lines Reported';
      case 'MISSING_AREAS': return 'Scotoma / Missing Grid';
      default: return status.replace(/_/g, ' ');
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${pad} ${getBadgeStyle()}`}>
      {getLabel()}
    </span>
  );
};

