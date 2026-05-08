import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'accent' | 'default' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const styleByVariant: Record<Variant, string> = {
  default: 'border-2 border-ink bg-white text-ink',
  primary: 'border-2 border-ink bg-ink text-white',
  accent: 'border-2 border-accent bg-accent text-white',
  ghost: 'border-2 border-ink bg-transparent text-ink',
};

export function Button({ variant = 'default', className = '', children, disabled, ...rest }: Props) {
  return (
    <button
      className={`font-handBold font-bold text-sm rounded-full px-4 py-2 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${styleByVariant[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
