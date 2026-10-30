import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildTimePacket, formatClock } from '@/lib/hid';
import { DateTimePicker } from './DateTimePicker';

export type ClockMode = 'now' | 'custom';

export type TimeStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'ok'; readonly at: Date }
  | { readonly kind: 'err'; readonly message: string };

export type ClockCardProps = {
  mode: ClockMode;
  preview: Date;
  connected: boolean;
  busy: boolean;
  status: TimeStatus;
  onModeChange: (mode: ClockMode) => void;
  onCustomChange: (value: Date) => void;
  onSend: () => void;
};

const byte = (value: number) => value.toString(16).toUpperCase().padStart(2, '0');

export function ClockCard({
  mode,
  preview,
  connected,
  busy,
  status,
  onModeChange,
  onCustomChange,
  onSend,
}: ClockCardProps) {
  const packet = buildTimePacket(preview);
  const canSend = connected && !busy;

  return (
    <aside className="h-fit rounded-panel border border-line bg-surface p-4">
      <Tabs value={mode} onValueChange={(next) => onModeChange(next as ClockMode)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Set the clock</h2>
          <TabsList aria-label="Clock source">
            <TabsTrigger value="now" disabled={busy}>
              Now
            </TabsTrigger>
            <TabsTrigger value="custom" disabled={busy}>
              Custom
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="now">
          <div className="mt-4 rounded-control border border-line bg-ink px-3 py-2.5">
            <p className="font-mono text-lg leading-none">{formatClock(preview)}</p>
            <p className="mt-1.5 text-[11px] text-muted">This computer's local time.</p>
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="mt-4 space-y-1.5">
            <span id="screen-time-label" className="block text-xs text-muted">
              Date and time
            </span>
            <DateTimePicker
              id="screen-time"
              labelledBy="screen-time-label"
              value={preview}
              disabled={busy}
              onChange={onCustomChange}
            />
            <p className="text-[11px] text-muted">Local time, 2000 to 2099.</p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button disabled={!canSend} onClick={onSend}>
          {busy ? 'Sending…' : 'Send time'}
        </Button>
      </div>

      <div aria-live="polite" className="min-h-5">
        {status.kind === 'ok' ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-sage">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-sage" />
            Sent. The screen clock is set to {formatClock(status.at)}.
          </p>
        ) : null}
        {status.kind === 'err' ? (
          <p className="mt-2 flex items-start gap-2 text-xs text-rust">
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rust" />
            {status.message}
          </p>
        ) : null}
        {!connected && status.kind === 'idle' ? (
          <p className="mt-2 text-xs text-muted">Connect the keyboard to send the time.</p>
        ) : null}
      </div>

      <details className="mt-4 border-t border-line/60 pt-3">
        <summary className="cursor-pointer text-[11px] text-muted">What gets sent</summary>
        <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
          <div className="flex gap-2">
            <dt>YY</dt>
            <dd className="text-ivory/80">{byte(packet[3] ?? 0)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>MM</dt>
            <dd className="text-ivory/80">{byte(packet[4] ?? 0)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>DD</dt>
            <dd className="text-ivory/80">{byte(packet[5] ?? 0)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>hh</dt>
            <dd className="text-ivory/80">{byte(packet[6] ?? 0)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>mm</dt>
            <dd className="text-ivory/80">{byte(packet[7] ?? 0)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>ss</dt>
            <dd className="text-ivory/80">{byte(packet[8] ?? 0)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          One 64-byte chunk between the 04 28 announce and the 04 02 commit, with screen slot 1. The
          keyboard keeps its own timezone, so a later daylight saving change will not move it.
        </p>
      </details>
    </aside>
  );
}
