import React from 'react';

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-stratum-900/90 dark:bg-stratum-900/90 border border-white/5 dark:border-white/5 rounded-2xl p-5 backdrop-blur-md transition-all duration-200 ${
        hover ? 'hover:border-cyanGlow/30 hover:bg-stratum-850/90 hover:shadow-xl' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

