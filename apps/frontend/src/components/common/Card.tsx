// enterprise-ai-agent-platform/apps/frontend/src/components/common/Card.tsx
import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className ? : string;
  padding ? : 'none' | 'sm' | 'md' | 'lg';
  variant ? : 'default' | 'bordered' | 'elevated';
  onClick ? : () => void;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className ? : string;
  icon ? : React.ReactNode;
  action ? : React.ReactNode;
}

export interface CardBodyProps {
  children: React.ReactNode;
  className ? : string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className ? : string;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

const variantStyles = {
  default: 'bg-white dark:bg-secondary-800',
  bordered: 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700',
  elevated: 'bg-white dark:bg-secondary-800 shadow-lg hover:shadow-xl transition-shadow duration-200',
};

export const Card: React.FC < CardProps > = ({
  children,
  className = '',
  padding = 'md',
  variant = 'bordered',
  onClick,
}) => {
  return (
    <div
      className={`
        rounded-xl
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${onClick ? 'cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC < CardHeaderProps > = ({
  children,
  className = '',
  icon,
  action,
}) => {
  return (
    <div className={`flex items-center justify-between mb-4 pb-3 border-b border-secondary-200 dark:border-secondary-700 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-secondary-500">{icon}</span>}
        <div className="font-medium text-secondary-900 dark:text-white">{children}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export const CardBody: React.FC < CardBodyProps > = ({ children, className = '' }) => {
  return <div className={className}>{children}</div>;
};

export const CardFooter: React.FC < CardFooterProps > = ({ children, className = '' }) => {
  return (
    <div className={`mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700 ${className}`}>
      {children}
    </div>
  );
};

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardBody.displayName = 'CardBody';
CardFooter.displayName = 'CardFooter';
export default Card;
