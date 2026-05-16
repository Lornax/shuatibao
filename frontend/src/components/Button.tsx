import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'accent' | 'default' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

// v2 视觉: primary 黑底白字 + 红影. 跟登录页"招牌按钮"统一.
const styleByVariant: Record<Variant, string> = {
  default: 'border-2 border-ink bg-white text-ink shadow-brutal-light',
  primary: 'border-2 border-ink bg-ink text-paper shadow-brutal-red',
  accent: 'border-2 border-accent bg-accent text-paper shadow-brutal-light',
  ghost: 'border-2 border-ink bg-transparent text-ink',
};

export function Button({ variant = 'default', className = '', children, disabled, ...rest }: Props) {
  return (
    <button
      className={`font-cn font-semibold text-sm rounded-full px-4 py-2 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:translate-y-px ${styleByVariant[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
