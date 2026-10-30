import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LIGHT_MAX_BRIGHTNESS,
  LIGHT_MAX_SPEED,
  LIGHT_MIN_BRIGHTNESS,
  LIGHT_MIN_SPEED,
  LIGHT_MODES,
  LIGHT_MODE_OFF,
} from '@/lib/lighting';
import { cn } from '@/lib/utils';
import { LightPreview } from './LightPreview';

export type LightingStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'ok'; readonly message: string }
  | { readonly kind: 'err'; readonly message: string };

export type LightingValues = {
  readonly mode: number;
  readonly color: string;
  readonly brightness: number;
  readonly speed: number;
  readonly colorful: boolean;
  readonly direction: number;
};

type LightingPanelProps = {
  connected: boolean;
  busy: boolean;
  status: LightingStatus;
  onApply: (values: LightingValues) => void;
};

const defaultFor = (mode: number) => ({
  colorful: mode !== 1 && mode !== LIGHT_MODE_OFF,
  direction: LIGHT_MODES.find((item) => item.id === mode)?.direction === 'vertical' ? 2 : 0,
});

export function LightingPanel({ connected, busy, status, onApply }: LightingPanelProps) {
  const [mode, setMode] = useState(1);
  const [color, setColor] = useState('#ff8000');
  const [brightness, setBrightness] = useState(5);
  const [speed, setSpeed] = useState(3);
  const [colorful, setColorful] = useState(false);
  const [direction, setDirection] = useState(0);

  const entry = LIGHT_MODES.find((item) => item.id === mode) ?? LIGHT_MODES[0]!;
  const off = mode === LIGHT_MODE_OFF;
  const controlsDisabled = busy || off;

  const changeMode = (next: number) => {
    setMode(next);
    const defaults = defaultFor(next);
    setColorful(defaults.colorful);
    setDirection(defaults.direction);
  };

  const values: LightingValues = { mode, color, brightness, speed, colorful, direction };

  return (
    <>
      <section className="flex min-w-0 flex-col gap-4">
        <div className="rounded-panel border border-line bg-surface p-3 sm:p-4">
          <LightPreview
            color={color}
            brightness={brightness}
            colorful={colorful && !off}
            off={off}
          />
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
            {off
              ? 'The light will be off.'
              : colorful
                ? 'The keyboard cycles through colours. The preview shows one arrangement.'
                : 'The preview shows the colour. The effect itself runs on the keyboard.'}
          </p>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <aside className="h-fit rounded-panel border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Set the light</h2>

          <div className="mt-4 space-y-1.5">
            <label htmlFor="light-mode" className="block text-xs text-muted">
              Effect
            </label>
            <select
              id="light-mode"
              value={mode}
              disabled={busy}
              className="h-9 w-full rounded-control border border-line bg-ink px-3 text-sm text-ivory disabled:cursor-not-allowed disabled:opacity-40"
              onChange={(event) => changeMode(Number(event.currentTarget.value))}
            >
              {LIGHT_MODES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {entry.color ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  id="light-color"
                  type="color"
                  aria-label="Colour"
                  value={color}
                  disabled={controlsDisabled || colorful}
                  className="size-10 cursor-pointer rounded-control border border-line bg-ink p-1 disabled:cursor-not-allowed disabled:opacity-40"
                  onChange={(event) => setColor(event.currentTarget.value)}
                />
                <div>
                  <p className="font-mono text-xs text-ivory">{color.toUpperCase()}</p>
                  <p className="text-[11px] text-muted">Colour</p>
                </div>
              </div>

              {entry.colorful ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={colorful}
                    disabled={controlsDisabled}
                    className="size-4 accent-brass"
                    onChange={(event) => setColorful(event.currentTarget.checked)}
                  />
                  Colourful
                </label>
              ) : null}
            </div>
          ) : null}

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
              disabled={controlsDisabled}
              className="h-1.5 w-full cursor-pointer accent-brass disabled:cursor-not-allowed disabled:opacity-40"
              onChange={(event) => setBrightness(Number(event.currentTarget.value))}
            />
            <div className="flex justify-between font-mono text-[10px] text-muted">
              <span>{LIGHT_MIN_BRIGHTNESS}</span>
              <span>{LIGHT_MAX_BRIGHTNESS}</span>
            </div>
          </div>

          {entry.speed ? (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="light-speed" className="block text-xs text-muted">
                  Speed
                </label>
                <span className="font-mono text-[11px] text-ivory/80">{speed}</span>
              </div>
              <input
                id="light-speed"
                type="range"
                min={LIGHT_MIN_SPEED}
                max={LIGHT_MAX_SPEED}
                step={1}
                value={speed}
                disabled={controlsDisabled}
                className="h-1.5 w-full cursor-pointer accent-brass disabled:cursor-not-allowed disabled:opacity-40"
                onChange={(event) => setSpeed(Number(event.currentTarget.value))}
              />
            </div>
          ) : null}

          {entry.direction !== 'none' ? (
            <div className="mt-4 space-y-1.5">
              <span className="block text-xs text-muted">Direction</span>
              <div className="inline-flex rounded-control border border-line bg-ink p-1">
                {(entry.direction === 'vertical'
                  ? [
                      { value: 2, label: 'Up', Icon: ArrowUp },
                      { value: 3, label: 'Down', Icon: ArrowDown },
                    ]
                  : [
                      { value: 1, label: 'Left', Icon: ArrowLeft },
                      { value: 0, label: 'Right', Icon: ArrowRight },
                    ]
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={direction === value}
                    disabled={controlsDisabled}
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-[6px] px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      direction === value
                        ? 'bg-keycap text-ivory shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]'
                        : 'text-muted hover:text-ivory',
                    )}
                    onClick={() => setDirection(value)}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <Button disabled={!connected || busy} onClick={() => onApply(values)}>
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
            Per-key colours are not built yet.
          </p>
        </aside>
      </div>
    </>
  );
}
