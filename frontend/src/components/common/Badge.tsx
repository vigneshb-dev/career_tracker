import React from 'react';

export type BadgeVariant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple' | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string; border: string }> = {
    brand: {
      bg: 'bg-brand-50',
      text: 'text-brand-700',
      dot: 'bg-brand-500',
      border: 'border-brand-200/60',
    },
    success: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      border: 'border-emerald-200/60',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      border: 'border-amber-200/60',
    },
    danger: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      border: 'border-rose-200/60',
    },
    neutral: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      dot: 'bg-slate-400',
      border: 'border-slate-200/80',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      dot: 'bg-purple-500',
      border: 'border-purple-200/60',
    },
    amber: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
      border: 'border-orange-200/60',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.brand;
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-lg border ${currentVariant.bg} ${currentVariant.text} ${currentVariant.border} ${sizeStyles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${currentVariant.dot}`} />}
      {children}
    </span>
  );
};
