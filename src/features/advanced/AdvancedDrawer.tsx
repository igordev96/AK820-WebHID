import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { realClock, type Clock } from '@/lib/clock';
import {
  HidClient,
  diagnose,
  listenReplies,
  parseHex,
  runDeepProbe,
  runMailboxProbe,
  sendRawCommand,
  type DeepProbeResult,
  type DiagnosticResult,
  type DiagnosticStatus,
  type LogFn,
  type MailboxProbeResult,
  type WebHidDevice,
} from '@/lib/hid';
import { cn } from '@/lib/utils';

type Tab = 'diagnostics' | 'deep' | 'mailbox' | 'raw';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'deep', label: 'Deep probe' },
  { id: 'mailbox', label: 'Mailbox' },
  { id: 'raw', label: 'Raw command' },
];

const statusClass: Record<DiagnosticStatus, string> = {
  ok: 'text-sage',
  warn: 'text-brass',
  err: 'text-rust',
};

const verdictClass: Record<DiagnosticStatus, string> = {
  ok: 'border-sage/40 bg-sage/5 text-sage',
  warn: 'border-brass/40 bg-brass/5 text-brass',
  err: 'border-rust/40 bg-rust/5 text-rust',
};

type AdvancedDrawerProps = {
  open: boolean;
  device: WebHidDevice | null;
  log: LogFn;
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
  clock?: Clock;
};

export function AdvancedDrawer({
  open,
  device,
  log,
  onClose,
  onBusyChange,
  clock = realClock,
}: AdvancedDrawerProps) {
  const [tab, setTab] = useState<Tab>('diagnostics');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const client = useMemo(() => (device ? new HidClient(device) : null), [device]);

  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [deep, setDeep] = useState<DeepProbeResult | null>(null);
  const [mailbox, setMailbox] = useState<MailboxProbeResult | null>(null);
  const [rawInput, setRawInput] = useState('04 18');
  const [rawLines, setRawLines] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  const run = async <T,>(task: () => Promise<T>, apply: (value: T) => void) => {
    if (!client || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    onBusyChange?.(true);
    try {
      apply(await task());
    } catch (error) {
      log(`advanced: ${error instanceof Error ? error.message : String(error)}`, 'err');
    } finally {
      busyRef.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const rawLog: LogFn = (message, level) => {
    log(message, level);
    setRawLines((lines) => [...lines, message]);
  };

  const sendRaw = (listen: boolean) => {
    if (!client) return;

    let payload: Uint8Array;
    try {
      payload = parseHex(rawInput);
    } catch (error) {
      rawLog(error instanceof Error ? error.message : String(error), 'err');
      return;
    }

    void run(
      async () => {
        const count = await sendRawCommand(client, payload);
        rawLog(`SENT ${payload.length} bytes in ${count} frame(s)`, 'info');
        if (listen) await listenReplies({ transport: client, clock, log: rawLog });
      },
      () => {},
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={() => {
          if (!busyRef.current) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-line bg-ink shadow-[-24px_0_60px_rgba(0,0,0,0.45)]"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <div>
            <h2 id="advanced-title" className="text-sm font-semibold">
              Advanced
            </h2>
            <p className="text-[11px] text-muted">
              {device?.productName ?? 'No keyboard connected'}
            </p>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon"
            aria-label="Close advanced"
            disabled={busy}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <div
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2"
          role="tablist"
          aria-label="Advanced tools"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              disabled={busy}
              className={cn(
                'h-7 whitespace-nowrap rounded-[6px] px-3 text-xs font-medium transition-colors disabled:opacity-50',
                tab === item.id
                  ? 'bg-keycap text-brass'
                  : 'text-muted hover:bg-surface-2 hover:text-ivory',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-4 rounded-control border border-line bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted">
            These tools send test commands to the keyboard. No keymap is written, and uploads stay
            locked while a probe runs.
          </p>

          {!client ? <p className="text-sm text-muted">Connect the keyboard first.</p> : null}

          {tab === 'diagnostics' ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Check the interface, the write path and the mailbox.
                </p>
                <Button
                  size="sm"
                  disabled={!client || busy}
                  onClick={() => {
                    if (!client || !device) return;
                    void run(
                      () => diagnose({ device, transport: client, clock, log }),
                      setDiagnostics,
                    );
                  }}
                >
                  {busy ? 'Running…' : 'Run diagnostics'}
                </Button>
              </div>

              {diagnostics ? (
                <>
                  <div
                    className={cn(
                      'rounded-control border px-3 py-2 text-sm',
                      verdictClass[diagnostics.level],
                    )}
                  >
                    {diagnostics.verdict}
                  </div>
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="text-muted">
                        <th className="py-1 pr-3 font-medium">Check</th>
                        <th className="py-1 pr-3 font-medium">Status</th>
                        <th className="py-1 font-medium">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostics.steps.map((step) => (
                        <tr key={step.name} className="border-t border-line">
                          <td className="py-1.5 pr-3 text-ivory">{step.name}</td>
                          <td className={cn('py-1.5 pr-3', statusClass[step.status])}>
                            {step.status}
                          </td>
                          <td className="py-1.5 text-muted">{step.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-sm text-muted">Not run yet.</p>
              )}
            </section>
          ) : null}

          {tab === 'deep' ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Test whether the mailbox is an echo, a generated reply or write-only.
                </p>
                <Button
                  size="sm"
                  disabled={!client || busy}
                  onClick={() => {
                    if (!client) return;
                    void run(() => runDeepProbe({ transport: client, clock, log }), setDeep);
                  }}
                >
                  {busy ? 'Running…' : 'Run deep probe'}
                </Button>
              </div>
              {deep ? (
                <>
                  <div
                    className={cn(
                      'rounded-control border px-3 py-2 text-sm',
                      verdictClass[deep.level],
                    )}
                  >
                    {deep.verdict}
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-control border border-line bg-surface p-3 font-mono text-xs text-muted">
                    {deep.lines.join('\n')}
                  </pre>
                </>
              ) : (
                <p className="text-sm text-muted">Not run yet.</p>
              )}
            </section>
          ) : null}

          {tab === 'mailbox' ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Probe opcode validation, the status byte and reply consumption.
                </p>
                <Button
                  size="sm"
                  disabled={!client || busy}
                  onClick={() => {
                    if (!client) return;
                    void run(() => runMailboxProbe({ transport: client, clock, log }), setMailbox);
                  }}
                >
                  {busy ? 'Running…' : 'Run mailbox test'}
                </Button>
              </div>
              {mailbox ? (
                <pre className="max-h-96 overflow-auto rounded-control border border-line bg-surface p-3 font-mono text-xs text-muted">
                  {mailbox.lines.join('\n')}
                  {mailbox.conclusions.length
                    ? `\n\n${mailbox.conclusions.map((line) => `⇒ ${line}`).join('\n\n')}`
                    : ''}
                </pre>
              ) : (
                <p className="text-sm text-muted">Not run yet.</p>
              )}
            </section>
          ) : null}

          {tab === 'raw' ? (
            <section className="space-y-4">
              <p className="text-sm text-muted">
                Send application-payload bytes. Up to 64 bytes is one frame; longer payloads are
                split into bare 64-byte chunks.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={rawInput}
                  spellCheck={false}
                  aria-label="Raw command hex"
                  className="h-9 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 font-mono text-xs text-ivory"
                  onChange={(event) => setRawInput(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={!client || busy} onClick={() => sendRaw(false)}>
                    Send
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!client || busy}
                    onClick={() => sendRaw(true)}
                  >
                    Send and listen
                  </Button>
                </div>
              </div>
              <pre className="min-h-32 overflow-auto rounded-control border border-line bg-surface p-3 font-mono text-xs text-muted">
                {rawLines.length ? rawLines.join('\n') : 'No output yet.'}
              </pre>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
