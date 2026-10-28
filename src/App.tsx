import { RotateCcw, Settings2, Terminal, Upload, Usb } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const layers = [
  { id: 'top', label: 'Top layer', note: 'The full table the keyboard types without Fn.' },
  {
    id: 'fn',
    label: 'Fn layer',
    note: 'Only the keys you change are sent. Every other Fn combination stays with the firmware.',
  },
] as const;

export function App() {
  const [layer, setLayer] = useState<(typeof layers)[number]['id']>('top');
  const [logOpen, setLogOpen] = useState(false);
  const activeLayer = layers.find((item) => item.id === layer) ?? layers[0];

  return (
    <div className="flex min-h-screen flex-col bg-ink text-ivory">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-key border border-line bg-keycap text-brass shadow-[inset_0_-2px_0_rgba(0,0,0,0.45)]">
              <Usb aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-[-0.01em]">AK820 Pro</p>
              <p className="text-[11px] text-muted">WebHID key remapper</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-2 hidden items-center gap-2 text-xs text-muted sm:flex">
              <span className="size-1.5 rounded-full bg-muted" aria-hidden="true" />
              Not connected
            </span>
            <Button variant="ghost" size="sm" disabled>
              <Settings2 aria-hidden="true" />
              Advanced
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={logOpen}
              aria-controls="log-panel"
              onClick={() => setLogOpen((open) => !open)}
            >
              <Terminal aria-hidden="true" />
              Log
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1280px] flex-1 content-start gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div
              className="inline-flex rounded-control border border-line bg-surface p-1"
              role="tablist"
              aria-label="Layer"
            >
              {layers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={layer === item.id}
                  className={cn(
                    'h-7 rounded-[6px] px-3 text-xs font-medium transition-colors',
                    layer === item.id
                      ? 'bg-keycap text-brass shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]'
                      : 'text-muted hover:text-ivory',
                  )}
                  onClick={() => setLayer(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="max-w-md text-xs text-muted sm:text-right">{activeLayer.note}</p>
          </div>

          <div className="overflow-hidden rounded-panel border border-line bg-surface">
            <div className="relative flex min-h-[360px] flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-key border border-line bg-keycap text-muted shadow-[inset_0_-3px_0_rgba(0,0,0,0.45)]">
                <Usb className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium">Connect your AK820</p>
                <p className="mx-auto max-w-sm text-sm text-muted">
                  Close the AJAZZ app first. The board appears here once the keyboard is connected.
                </p>
              </div>
              <Button disabled>
                <Usb aria-hidden="true" />
                Connect keyboard
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" size="sm" disabled className="self-start sm:self-auto">
              <RotateCcw aria-hidden="true" />
              Restore factory map
            </Button>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs text-muted">No pending changes</span>
              <Button disabled>
                <Upload aria-hidden="true" />
                Upload changes
              </Button>
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-panel border border-line bg-surface p-4">
          <p className="text-xs text-muted">Inspector</p>
          <p className="mt-3 text-sm font-medium">No key selected</p>
          <p className="mt-1 text-sm text-muted">Select a key on the board to edit it.</p>

          <div className="mt-6 space-y-4 opacity-40">
            <div className="space-y-1.5">
              <span className="text-xs text-muted">Sends</span>
              <div className="h-9 rounded-control border border-line bg-ink" />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted">Raw usage</span>
              <div className="h-9 rounded-control border border-line bg-ink font-mono text-xs" />
            </div>
            <div className="h-8 rounded-control border border-line bg-ink" />
          </div>
        </aside>
      </main>

      <footer id="log-panel" className="border-t border-line">
        <div className="mx-auto w-full max-w-[1280px] px-4">
          <div className="flex h-11 items-center justify-between text-xs text-muted">
            <span>Log</span>
            <span>{logOpen ? 'No activity yet.' : 'Collapsed'}</span>
          </div>
          {logOpen ? (
            <div
              className="max-h-40 overflow-y-auto border-t border-line py-3 font-mono text-xs text-muted"
              role="log"
              aria-live="polite"
            >
              No activity yet.
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
