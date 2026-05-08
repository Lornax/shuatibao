import type { ReactNode } from 'react';

export function Layout({ title, children, back }: { title: string; children: ReactNode; back?: () => void }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-md mx-auto px-4 py-4">
        <header className="mb-3 flex items-center gap-2">
          {back && (
            <button onClick={back} className="font-handBold text-2xl leading-none">
              ‹
            </button>
          )}
          <h1 className="font-display text-3xl flex-1">{title}</h1>
        </header>
        {children}
      </div>
    </div>
  );
}
