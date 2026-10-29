import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatClock, formatTimeInput } from '@/lib/hid';
import { cn } from '@/lib/utils';

type DateTimePickerProps = {
  id?: string;
  labelledBy?: string;
  value: Date;
  disabled?: boolean;
  onChange: (value: Date) => void;
};

const withDay = (base: Date, day: Date): Date =>
  new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
    0,
  );

const withTime = (base: Date, hour: number, minute: number, second: number): Date =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute, second, 0);

export function DateTimePicker({ id, labelledBy, value, disabled, onChange }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(value);

  const useNow = () => {
    const at = new Date();
    onChange(at);
    setMonth(at);
  };

  const setTime = (text: string) => {
    const [hour, minute, second] = text.split(':').map(Number);
    if (hour === undefined || Number.isNaN(hour) || minute === undefined || Number.isNaN(minute)) {
      return;
    }
    onChange(withTime(value, hour, minute, second ?? value.getSeconds()));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-labelledby={labelledBy ? `${labelledBy} ${id ?? ''}`.trim() : undefined}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-control border border-line bg-ink px-3 font-mono text-xs text-ivory',
            'transition-colors hover:border-muted/50 disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {formatTimeInput(value)}
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>

      <PopoverContent aria-label="Pick a date and time">
        <Calendar
          mode="single"
          selected={value}
          month={month}
          onMonthChange={setMonth}
          captionLayout="dropdown"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(2099, 11)}
          labels={{
            labelMonthDropdown: () => 'Month',
            labelYearDropdown: () => 'Year',
          }}
          onSelect={(day) => {
            if (day) onChange(withDay(value, day));
          }}
        />

        <div className="mt-3 space-y-1.5 border-t border-line/60 pt-3">
          <label htmlFor={id ? `${id}-time` : undefined} className="block text-[11px] text-muted">
            Time
          </label>
          <input
            id={id ? `${id}-time` : undefined}
            type="time"
            step="1"
            aria-label="Time"
            value={formatClock(value)}
            disabled={disabled}
            className="h-8 w-full rounded-control border border-line bg-ink px-2 font-mono text-xs text-ivory transition-colors hover:border-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
            onChange={(event) => setTime(event.currentTarget.value)}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" disabled={disabled} onClick={useNow}>
            Now
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
