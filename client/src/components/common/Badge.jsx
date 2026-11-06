import React from 'react';

const colorStyles = {
  cyan: 'bg-cyanGlow/10 text-cyanGlow border-cyanGlow/20',
  indigo: 'bg-indigoGlow/10 text-indigo-400 border-indigo-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  neutral: 'bg-slate-800 text-slate-300 border-slate-700'
};

export function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  const sizeClasses = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-0.5';
  const style = colorStyles[variant] || colorStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-full border ${style} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
}

