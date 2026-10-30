import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LIGHT_MAX_BRIGHTNESS, LIGHT_MIN_BRIGHTNESS } from '@/lib/lighting';
import { LightPreview } from './LightPreview';

export type LightingStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'ok'; readonly message: string }
  | { readonly kind: 'err'; readonly message: string };

type LightingPanelProps = {
  connected: boolean;
  busy: boolean;
  status: LightingStatus;
  onApply: (color: string, brightness: number) => void;
};

export function LightingPanel({ connected, busy, status, onApply }: LightingPanelProps) {
  const [color, setColor] = useState('#ff8000');
  const [brightness, setBrightness] = useState(3);

  return (
    <>
      <section className="flex min-w-0 flex-col gap-4">
        <div className="rounded-panel border border-line bg-surface p-3 sm:p-4">
          <LightPreview color={color} brightness={brightness} />
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
            This is the colour and brightness the page sends. The keyboard's own effect may look a
            little different.
          </p>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <aside className="h-fit rounded-panel border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Set the light</h2>

          <div className="mt-4 flex items-center gap-3">
            <input
              id="light-color"
              type="color"
              aria-label="Colour"
              value={color}
              disabled={busy}
              className="size-10 cursor-pointer rounded-control border border-line bg-ink p-1 disabled:cursor-not-allowed disabled:opacity-40"
              onChange={(event) => setColor(event.currentTarget.value)}
            />
            <div>
              <p className="font-mono text-xs text-ivory">{color.toUpperCase()}</p>
              <p className="text-[11px] text-muted">Solid colour</p>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="light-brightness" className="block text-xs text-muted">
                Brightness
              </label>
              <span className="font-mono text-[11px] text-ivory/80">{brightness}</span>
            </div>
            <input
              id="light-brightness"
              type="range"
              min={LIGHT_MIN_BRIGHTNESS}
              max={LIGHT_MAX_BRIGHTNESS}
              step={1}
              value={brightness}
              disabled={busy}
              className="h-1.5 w-full cursor-pointer accent-brass disabled:cursor-not-allowed disabled:opacity-40"
              onChange={(event) => setBrightness(Number(event.currentTarget.value))}
            />
            <div className="flex justify-between font-mono text-[10px] text-muted">
              <span>{LIGHT_MIN_BRIGHTNESS}</span>
              <span>{LIGHT_MAX_BRIGHTNESS}</span>
            </div>
          </div>

          <div className="mt-4">
            <Button disabled={!connected || busy} onClick={() => onApply(color, brightness)}>
              {busy ? 'Sending…' : 'Apply light'}
            </Button>
          </div>

          <div aria-live="polite">
            {status.kind === 'ok' ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-sage">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-sage" />
                {status.message}
              </p>
            ) : null}
            {status.kind === 'err' ? (
              <p className="mt-3 flex items-start gap-2 text-xs text-rust">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rust"
                />
                {status.message}
              </p>
            ) : null}
            {!connected && status.kind === 'idle' ? (
              <p className="mt-3 text-xs text-muted">Connect the keyboard to change the light.</p>
            ) : null}
          </div>

          <p className="mt-4 border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted">
            Solid colour only for now. Effect modes and per-key colours come next.
          </p>
        </aside>
      </div>
    </>
  );
}
