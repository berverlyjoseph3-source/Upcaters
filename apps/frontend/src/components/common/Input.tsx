// enterprise-ai-agent-platform/apps/frontend/src/components/common/Input.tsx
import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export type InputVariant = 'default' | 'error' | 'success';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: InputSize;
  required?: boolean;
  showPasswordToggle?: boolean;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-base rounded-lg',
  lg: 'px-5 py-3 text-lg rounded-xl',
};

const iconSizeStyles: Record<InputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const paddingWithIcon: Record<InputSize, { left: string; right: string }> = {
  sm: { left: 'pl-9', right: 'pr-9' },
  md: { left: 'pl-11', right: 'pr-11' },
  lg: { left: 'pl-13', right: 'pr-13' },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label,
    error,
    success,
    hint,
    icon,
    iconPosition = 'left',
    size = 'md',
    required = false,
    showPasswordToggle = false,
    type = 'text',
    className = '',
    id,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    const hasError = !!error;
    const hasSuccess = success && !hasError;
    
    const inputType = showPasswordToggle && showPassword ? 'text' : type;
    const inputSize = sizeStyles[size];
    const iconSize = iconSizeStyles[size];
    const paddingIcon = paddingWithIcon[size];
    
    const borderStyles = hasError
      ? 'border-error focus:ring-error focus:border-error'
      : hasSuccess
        ? 'border-success focus:ring-success focus:border-success'
        : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500';
    
    const bgStyles = disabled ? 'bg-secondary-100 cursor-not-allowed' : 'bg-white';

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-secondary-700 mb-1.5"
          >
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className={`text-secondary-400 ${iconSize}`}>{icon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={`
              w-full
              ${inputSize}
              ${icon && iconPosition === 'left' ? paddingIcon.left : 'pl-4'}
              ${(icon && iconPosition === 'right') || showPasswordToggle ? paddingIcon.right : 'pr-4'}
              ${borderStyles}
              ${bgStyles}
              placeholder-secondary-400
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200
              ${className}
            `}
            aria-invalid={hasError}
            aria-describedby={`
              ${hasError ? `${inputId}-error` : ''}
              ${hint ? `${inputId}-hint` : ''}
            `.trim() || undefined}
            disabled={disabled}
            required={required}
            {...props}
          />
          
          {(icon && iconPosition === 'right') && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className={`text-secondary-400 ${iconSize}`}>{icon}</span>
            </div>
          )}
          
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className={`${iconSize} text-secondary-400 hover:text-secondary-600 transition-colors`} />
              ) : (
                <Eye className={`${iconSize} text-secondary-400 hover:text-secondary-600 transition-colors`} />
              )}
            </button>
          )}
          
          {hasSuccess && !hasError && !showPasswordToggle && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CheckCircle className={`${iconSize} text-success`} />
            </div>
          )}
        </div>
        
        {hasError && (
          <div className="mt-1.5 flex items-start gap-1.5">
            <AlertCircle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
            <p id={`${inputId}-error`} className="text-sm text-error">
              {error}
            </p>
          </div>
        )}
        
        {!hasError && hint && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-secondary-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
