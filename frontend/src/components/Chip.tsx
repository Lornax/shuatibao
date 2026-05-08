import type { HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
  children: ReactNode;
};

export function Chip({ active = false, className = '', children, ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 border-[1.5px] border-ink rounded-full px-2.5 py-0.5 font-cn text-xs cursor-pointer select-none ${
        active ? 'bg-accent-2 font-bold' : 'bg-white'
      } ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
