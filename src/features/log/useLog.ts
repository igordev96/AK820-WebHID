import { useCallback, useRef, useState } from 'react';
import type { LogFn, LogLevel } from '@/lib/hid/transfer';

export type LogEntry = {
  readonly id: number;
  readonly time: string;
  readonly message: string;
  readonly level: LogLevel;
};

const timestamp = () => {
  const now = new Date();
  return `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`;
};

export function formatLog(entries: readonly LogEntry[]): string {
  return entries.map((entry) => `${entry.time}  ${entry.message}`).join('\n');
}

export function useLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(1);

  const log: LogFn = useCallback((message, level = 'dim') => {
    const entry: LogEntry = {
      id: nextId.current,
      time: timestamp(),
      message,
      level,
    };
    nextId.current += 1;
    setEntries((current) => [...current, entry]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, log, clear };
}
