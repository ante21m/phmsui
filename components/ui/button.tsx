import * as React from 'react';

const variants = {
  default: 'bg-teal-700 text-white hover:bg-teal-800 shadow-sm',
  outline: 'border border-border bg-background hover:bg-muted text-foreground',
  ghost: 'hover:bg-muted text-foreground',
};

const sizes = {
  sm: 'h-7 px-2.5 text-xs rounded',
  default: 'h-9 px-4 text-sm rounded-md',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = 'Button';
