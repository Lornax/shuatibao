import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  checked?: boolean;
  shape?: 'box' | 'circle';
};

export function Check({ checked = false, shape = 'box', className = '', ...rest }: Props) {
  const radius = shape === 'box' ? 'rounded' : 'rounded-full';
  return (
    <div
      className={`w-[18px] h-[18px] border-[1.5px] border-ink ${radius} flex items-center justify-center flex-shrink-0 cursor-pointer ${
        checked ? 'bg-ink' : 'bg-white'
      } ${className}`}
      {...rest}
    >
      {checked && shape === 'box' && <span className="text-white text-[13px] leading-none">✓</span>}
      {checked && shape === 'circle' && <span className="w-2 h-2 bg-white rounded-full" />}
    </div>
  );
}
