import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusTone = 'ok' | 'err' | 'muted';

type StatusNoteProps = {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
};

const dot: Record<StatusTone, string> = {
  ok: 'bg-sage',
  err: 'bg-rust',
  muted: 'bg-muted/60',
};

const text: Record<StatusTone, string> = {
  ok: 'text-sage',
  err: 'text-rust',
  muted: 'text-muted',
};

/**
 * The one-line result under a send button: a dot, a short sentence and the
 * colour that says whether the keyboard accepted it.
 */
export function StatusNote({ tone, children, className }: StatusNoteProps) {
  return (
    <p className={cn('flex items-start gap-2 text-xs', text[tone], className)}>
      <span aria-hidden="true" className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', dot[tone])} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
