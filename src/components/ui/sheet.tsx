import * as DialogPrimitive from '@radix-ui/react-dialog';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="sheet-overlay"
        className="sheet-overlay fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm"
      />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'sheet-content fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-line bg-ink shadow-[-24px_0_60px_rgba(0,0,0,0.45)] outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      data-slot="sheet-header"
      className={cn(
        'flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4',
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-sm font-semibold', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-[11px] text-muted', className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle };
