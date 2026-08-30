// enterprise-ai-agent-platform/apps/frontend/src/components/common/Button.tsx
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes < HTMLButtonElement > {
  variant ? : ButtonVariant;
  size ? : ButtonSize;
  loading ? : boolean;
  fullWidth ? : boolean;
  leftIcon ? : React.ReactNode;
  rightIcon ? : React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record < ButtonVariant, { base: string;disabled: string;loading: string } > = {
  primary: {
    base: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-sm focus:ring-primary-500',
    disabled: 'bg-primary-400 cursor-not-allowed',
    loading: 'bg-primary-500 cursor-wait',
  },
  secondary: {
    base: 'bg-secondary-600 hover:bg-secondary-700 active:bg-secondary-800 text-white shadow-sm focus:ring-secondary-500',
    disabled: 'bg-secondary-400 cursor-not-allowed',
    loading: 'bg-secondary-500 cursor-wait',
  },
  outline: {
    base: 'border-2 border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400 active:bg-secondary-100 focus:ring-primary-500',
    disabled: 'border-secondary-200 text-secondary-400 cursor-not-allowed bg-secondary-50',
    loading: 'border-secondary-300 bg-secondary-50 cursor-wait',
  },
  ghost: {
    base: 'text-secondary-600 hover:bg-secondary-100 active:bg-secondary-200 focus:ring-primary-500',
    disabled: 'text-secondary-400 cursor-not-allowed',
    loading: 'text-secondary-400 cursor-wait',
  },
  danger: {
    base: 'bg-error hover:bg-red-700 active:bg-red-800 text-white shadow-sm focus:ring-red-500',
    disabled: 'bg-red-400 cursor-not-allowed',
    loading: 'bg-red-500 cursor-wait',
  },
  success: {
    base: 'bg-success hover:bg-green-700 active:bg-green-800 text-white shadow-sm focus:ring-green-500',
    disabled: 'bg-green-400 cursor-not-allowed',
    loading: 'bg-green-500 cursor-wait',
  },
  warning: {
    base: 'bg-warning hover:bg-orange-700 active:bg-orange-800 text-white shadow-sm focus:ring-orange-500',
    disabled: 'bg-orange-400 cursor-not-allowed',
    loading: 'bg-orange-500 cursor-wait',
  },
};

const sizeStyles: Record < ButtonSize, string > = {
  xs: 'px-2.5 py-1.5 text-xs rounded-md gap-1',
  sm: 'px-3 py-2 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-base rounded-lg gap-2',
  lg: 'px-6 py-3 text-lg rounded-xl gap-2',
  xl: 'px-8 py-4 text-xl rounded-xl gap-3',
};

export const Button: React.FC < ButtonProps > = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || loading;
  const variantStyle = variantStyles[variant];
  const activeStyle = isDisabled ?
    variantStyle.disabled :
    loading ?
    variantStyle.loading :
    variantStyle.base;
  
  return (
    <button
      type={type}
      className={`
        ${activeStyle}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        inline-flex items-center justify-center
        font-medium
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:pointer-events-none
        ${className}
      `}
      disabled={isDisabled}
      aria-busy={loading}
      aria-label={loading ? 'Loading...' : props['aria-label']}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span className={loading ? 'opacity-0 absolute' : ''}>{children}</span>
      {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

Button.displayName = 'Button';
export default Button;
