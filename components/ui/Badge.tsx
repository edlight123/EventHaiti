import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | 'vip' | 'trending' | 'new';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm',
  secondary: 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-sm',
  success: 'bg-success-50 text-success-700 border border-success-200',
  warning: 'bg-warning-50 text-warning-700 border border-warning-200',
  error: 'bg-error-50 text-error-700 border border-error-200',
  neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
  vip: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md animate-pulse',
  trending: 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md',
  new: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs rounded-md',
  md: 'px-3 py-1 text-sm rounded-lg',
  lg: 'px-4 py-1.5 text-base rounded-xl',
};

export default function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
