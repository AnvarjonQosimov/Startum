import React from 'react';

const variants = {
  primary: 'bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-stratum-950 font-semibold shadow-lg shadow-cyan-500/20 active:scale-[0.98]',
  secondary: 'bg-stratum-800 hover:bg-stratum-750 text-slate-100 border border-white/10 active:scale-[0.98]',
  indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/25 active:scale-[0.98]',
  outline: 'bg-transparent border border-white/15 hover:border-white/30 text-slate-200 hover:bg-white/5 active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white',
  danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
};

const sizes = {
  xs: 'text-xs px-2.5 py-1 rounded-md gap-1.5',
  sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2 rounded-lg gap-2',
  lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5'
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none ${variants[variant] || variants.secondary} ${sizes[size]} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : Icon ? (
        <Icon className={size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      ) : null}
      {children}
    </button>
  );
}

