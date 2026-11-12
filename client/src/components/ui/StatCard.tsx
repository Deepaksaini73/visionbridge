import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon | React.ReactNode;
  iconColor?: string; // e.g. 'text-teal-600'
  iconBg?: string; // e.g. 'bg-teal-50 border-teal-100'
  color?: 'teal' | 'navy' | 'rose' | 'amber' | 'emerald' | 'blue';
  badge?: {
    text: string;
    color?: 'teal' | 'navy' | 'rose' | 'amber' | 'emerald' | 'blue';
  };
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  accentBorderColor?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBg,
  color = 'teal',
  badge,
  badgeText,
  badgeVariant = 'info',
  accentBorderColor,
  onClick,
}) => {
  // Preset themes based on color prop
  const colorThemes = {
    teal: {
      text: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-100',
      border: 'hover:border-teal-300',
      badge: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    navy: {
      text: 'text-navy-950',
      bg: 'bg-navy-50 border-navy-200',
      border: 'hover:border-navy-400',
      badge: 'bg-navy-50 text-navy-950 border-navy-200',
    },
    rose: {
      text: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      border: 'hover:border-rose-300',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    amber: {
      text: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      border: 'hover:border-amber-300',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    emerald: {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      border: 'hover:border-emerald-300',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    blue: {
      text: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
      border: 'hover:border-blue-300',
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
    },
  };

  const currentTheme = colorThemes[color] || colorThemes.teal;
  const activeIconColor = iconColor || currentTheme.text;
  const activeIconBg = iconBg || currentTheme.bg;
  const activeBorder = accentBorderColor || currentTheme.border;

  // Render icon whether it's a Component or JSX Element
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as LucideIcon;
    return <IconComponent className="w-5 h-5" />;
  };

  const displayBadgeText = badge?.text || badgeText;
  const displayBadgeColor = badge?.color
    ? colorThemes[badge.color]?.badge
    : badgeVariant === 'danger'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : badgeVariant === 'warning'
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : badgeVariant === 'success'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : currentTheme.badge;

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-healthcare-md border border-slate-200 ${activeBorder} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-950 font-display">
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${activeIconBg} ${activeIconColor} shadow-2xs`}>
          {renderIcon()}
        </div>
      </div>

      {(subtitle || displayBadgeText) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500 truncate text-[11px] font-medium">{subtitle}</span>}
          {displayBadgeText && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ml-2 shadow-xs ${displayBadgeColor}`}
            >
              {displayBadgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
