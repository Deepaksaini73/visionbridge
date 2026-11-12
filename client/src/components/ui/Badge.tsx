import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-medium gap-1',
    md: 'text-xs px-2.5 py-0.5 font-semibold gap-1.5',
    lg: 'text-sm px-3.5 py-1 font-semibold gap-2',
  };

  const variantClasses: Record<BadgeVariant, { badge: string; dot: string }> = {
    default: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200/80',
      dot: 'bg-slate-400',
    },
    primary: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dot: 'bg-blue-500',
    },
    success: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    warning: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    danger: {
      badge: 'bg-rose-50 text-rose-800 border-rose-200/80',
      dot: 'bg-rose-500',
    },
    info: {
      badge: 'bg-teal-50 text-teal-800 border-teal-200/80',
      dot: 'bg-teal-500',
    },
    purple: {
      badge: 'bg-purple-50 text-purple-800 border-purple-200/80',
      dot: 'bg-purple-500',
    },
    neutral: {
      badge: 'bg-slate-800 text-slate-100 border-slate-700',
      dot: 'bg-slate-300',
    },
  };

  const { badge: vStyle, dot: dotStyle } = variantClasses[variant] || variantClasses.default;

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs transition-colors ${sizeClasses[size]} ${vStyle} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />}
      {children}
    </span>
  );
};

/**
 * Convenience helper that maps clinical workflow status strings to standardized badges
 */
export const ClinicalStatusBadge: React.FC<{ status?: string | null; className?: string }> = ({ 
  status,
  className = ''
}) => {
  if (!status) {
    return <Badge variant="default" dot className={className}>Registered</Badge>;
  }

  const normalized = String(status).toUpperCase();

  switch (normalized) {
    case 'REGISTERED':
      return <Badge variant="default" dot className={className}>Registered</Badge>;
    case 'INTERVIEW_IN_PROGRESS':
      return <Badge variant="info" dot className={className}>Interview In Progress</Badge>;
    case 'INTERVIEW_COMPLETED':
      return <Badge variant="primary" dot className={className}>Interview Done</Badge>;
    case 'SCREENING_IN_PROGRESS':
      return <Badge variant="warning" dot className={className}>Screening In Progress</Badge>;
    case 'SCREENING_COMPLETED':
      return <Badge variant="primary" dot className={className}>Screening Complete</Badge>;
    case 'PENDING_REVIEW':
      return <Badge variant="warning" dot className={className}>Pending Review</Badge>;
    case 'REVIEWED':
      return <Badge variant="success" dot className={className}>Reviewed & Signed</Badge>;
    case 'REFERRAL_REQUIRED':
      return <Badge variant="danger" dot className={className}>Referral Recommended</Badge>;
    case 'RETEST_REQUESTED':
      return <Badge variant="warning" dot className={className}>Retest Requested</Badge>;
    case 'NORMAL':
      return <Badge variant="success" dot className={className}>Normal</Badge>;
    case 'SUSPECTED_PATHOLOGY':
      return <Badge variant="danger" dot className={className}>Suspected Pathology</Badge>;
    case 'INCONCLUSIVE':
      return <Badge variant="warning" dot className={className}>Inconclusive</Badge>;
    case 'POOR_IMAGE_QUALITY':
      return <Badge variant="default" dot className={className}>Poor Quality</Badge>;
    default:
      return <Badge variant="default" className={className}>{String(status).replace(/_/g, ' ')}</Badge>;
  }
};
