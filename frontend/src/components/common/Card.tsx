import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  noPadding = false,
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-card transition-all duration-200 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
          <div>
            {title && <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
};
