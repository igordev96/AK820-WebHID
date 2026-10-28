import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { LogLevel } from '@/lib/hid/transfer';
import { cn } from '@/lib/utils';
import { formatLog, type LogEntry } from './useLog';

const levelClass: Record<LogLevel, string> = {
  info: 'text-ivory',
  dim: 'text-muted',
  ok: 'text-sage',
  warn: 'text-brass',
  err: 'text-rust',
};

type LogPanelProps = {
  entries: readonly LogEntry[];
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
};

export function LogPanel({ entries, open, onToggle, onClear }: LogPanelProps) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && entries.length && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [entries, open]);

  const copy = async () => {
    if (!navigator.clipboard || !entries.length) return;
    try {
      await navigator.clipboard.writeText(formatLog(entries));
    } catch {
      // Clipboard access can be denied; the log stays available on screen.
    }
  };

  return (
    <footer id="log-panel" className="border-t border-line">
      <div className="mx-auto w-full max-w-[1280px] px-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="log-entries"
          aria-label={open ? 'Hide log' : 'Show log'}
          className="flex h-11 w-full items-center justify-between text-xs text-muted transition-colors hover:text-ivory"
          onClick={onToggle}
        >
          <span>Log</span>
          <span>{open ? `${entries.length} entries` : 'Show'}</span>
        </button>

        {open ? (
          <div className="space-y-2 pb-3">
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={!entries.length} onClick={copy}>
                Copy
              </Button>
              <Button variant="ghost" size="sm" disabled={!entries.length} onClick={onClear}>
                Clear
              </Button>
            </div>
            <div
              id="log-entries"
              ref={scroller}
              role="log"
              aria-live="polite"
              className="max-h-56 overflow-y-auto rounded-control border border-line bg-ink p-3 font-mono text-xs leading-relaxed"
            >
              {entries.length ? (
                entries.map((entry) => (
                  <div key={entry.id} className="break-words">
                    <span className="text-muted/70">{entry.time}</span>{' '}
                    <span className={cn(levelClass[entry.level])}>{entry.message}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted">No activity yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
