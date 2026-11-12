import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  } | React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = Inbox,
  title,
  description,
  action,
  compact = false,
}) => {
  const renderIcon = () => {
    if (!icon) return <Inbox className="w-7 h-7 text-slate-500" />;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as LucideIcon;
    return <IconComponent className="w-7 h-7 text-slate-500" />;
  };

  const renderAction = () => {
    if (!action) return null;
    if (React.isValidElement(action)) return action;
    if (typeof action === 'object' && 'label' in action && 'onClick' in action) {
      return (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          {action.label}
        </button>
      );
    }
    return null;
  };

  return (
    <div
      className={`text-center flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 backdrop-blur-xs ${
        compact ? 'p-6 sm:p-8' : 'p-10 sm:p-14'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
        {renderIcon()}
      </div>
      <h3 className="text-base font-bold text-navy-950 font-display mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-5">
        {description}
      </p>
      {renderAction()}
    </div>
  );
};
