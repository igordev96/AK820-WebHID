import type * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-control border border-line bg-ink px-3 text-sm text-ivory',
        'transition-colors hover:border-muted/50 placeholder:text-muted/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
