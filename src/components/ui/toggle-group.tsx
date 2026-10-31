import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const ToggleGroup = ToggleGroupPrimitive.Root;

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        'inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted transition-colors',
        'hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
        'disabled:pointer-events-none disabled:opacity-40',
        'data-[state=on]:bg-keycap data-[state=on]:text-ivory data-[state=on]:shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]',
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
