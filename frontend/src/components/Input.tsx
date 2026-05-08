import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const baseStyle = 'border-[1.5px] border-ink rounded-lg bg-white px-3 py-2 font-cn text-sm text-ink w-full focus:outline-none focus:ring-2 focus:ring-accent';

export function Input({ className = '', ...rest }: InputProps) {
  return <input className={`${baseStyle} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: AreaProps) {
  return <textarea className={`${baseStyle} ${className}`} rows={3} {...rest} />;
}
