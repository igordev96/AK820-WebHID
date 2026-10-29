import { ChevronLeft, ChevronRight } from 'lucide-react';
import type * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

type ChevronProps = {
  orientation?: 'left' | 'right' | 'up' | 'down';
  className?: string;
  size?: number;
  disabled?: boolean;
};

function CalendarChevron({ orientation, ...props }: ChevronProps) {
  return orientation === 'left' ? <ChevronLeft {...props} /> : <ChevronRight {...props} />;
}

function Calendar({
  className,
  classNames,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn('p-0', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'space-y-2',
        nav: 'hidden',
        dropdowns: 'flex items-center justify-center gap-1.5 pb-1',
        dropdown_root: 'inline-flex',
        dropdown:
          'h-7 rounded-control border border-line bg-ink px-2 text-xs text-ivory transition-colors hover:border-muted/50',
        caption_label: 'sr-only',
        button_previous:
          'inline-flex size-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-ivory disabled:pointer-events-none disabled:opacity-40',
        button_next:
          'inline-flex size-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-ivory disabled:pointer-events-none disabled:opacity-40',
        month_caption: 'flex flex-1 items-center justify-center',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex w-full',
        weekday: 'flex-1 text-center text-[10px] font-normal text-muted',
        week: 'mt-1 flex w-full',
        day: 'flex-1 p-0 text-center',
        day_button:
          'mx-auto flex size-8 items-center justify-center rounded-[6px] text-xs text-ivory/90 transition-colors hover:bg-surface-2 disabled:pointer-events-none',
        selected: '[&_button]:bg-brass [&_button]:text-ink [&_button]:hover:bg-brass-bright',
        today: '[&_button]:text-brass',
        outside: '[&_button]:text-muted/40',
        disabled: '[&_button]:text-muted/25',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
