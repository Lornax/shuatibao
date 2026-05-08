import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'soft' | 'thick' | 'dashed';

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  children: ReactNode;
};

const styleByVariant: Record<Variant, string> = {
  soft: 'border-[1.5px] border-ink rounded-soft bg-white',
  thick: 'border-[2.5px] border-ink rounded-thick bg-white shadow-brutal-sm',
  dashed: 'border-[1.5px] border-dashed border-ink-2 rounded-thick bg-transparent',
};

export function Box({ variant = 'soft', className = '', children, ...rest }: Props) {
  return (
    <div className={`${styleByVariant[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
