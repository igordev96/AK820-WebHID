import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { AdvancedDrawer } from '@/features/advanced/AdvancedDrawer';
import { AppHeader } from '@/features/device/AppHeader';
import { ViewTabs, type View } from '@/features/device/ViewTabs';
import { useDevice } from '@/features/device/useDevice';
import { KeyInspector } from '@/features/editor/KeyInspector';
import { KeymapBoard } from '@/features/editor/KeymapBoard';
import { LayerTabs } from '@/features/editor/LayerTabs';
import { PendingBar } from '@/features/editor/PendingBar';
import { WriteRules } from '@/features/editor/WriteRules';
import { LogPanel } from '@/features/log/LogPanel';
import { useLog } from '@/features/log/useLog';
import { ScreenPanel } from '@/features/screen/ScreenPanel';
import type { ImageStatus } from '@/features/screen/ImageCard';
import type { TimeStatus } from '@/features/screen/ClockCard';
import { realClock } from '@/lib/clock';
import {
  createInitialState,
  editorReducer,
  getActiveRows,
  getPendingCount,
  getSelectedRow,
  loadFnOverrides,
  saveFnOverrides,
  validateUsage,
  type EditorRow,
  type EditorState,
  type Layer,
  type StorageLike,
} from '@/lib/editor';
import { hex } from '@/lib/format';
import { HidClient, STATUS, TransferService, formatClock, isTransportFailed } from '@/lib/hid';
import { FN_LOCKED, buildTable } from '@/lib/keymap';
import { buildAnimationPayload } from '@/lib/screen';
import { cn } from '@/lib/utils';

function loadInitialState(storage: StorageLike | null): EditorState {
  if (!storage) return createInitialState();
  try {
    return createInitialState(loadFnOverrides(storage));
  } catch {
    return createInitialState();
  }
}

export function App() {
  const storage = useMemo<StorageLike | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }, []);

  const [state, dispatch] = useReducer(editorReducer, storage, loadInitialState);
  const { entries, log, clear: clearLog } = useLog();
  const device = useDevice({ log });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [view, setView] = useState<View>('keys');
  const [timeStatus, setTimeStatus] = useState<TimeStatus>({ kind: 'idle' });
  const [imageStatus, setImageStatus] = useState<ImageStatus>({ kind: 'idle' });
  const [imageProgress, setImageProgress] = useState<{
    readonly sent: number;
    readonly total: number;
  } | null>(null);

  const transfer = useMemo(() => {
    if (!device.device || !device.configFound) return null;
    const config = new HidClient(device.device);
    const screen = device.screenDevice ? new HidClient(device.screenDevice) : null;
    return new TransferService(config, realClock, log, screen ?? undefined);
  }, [device.device, device.screenDevice, device.configFound, log]);

  const rows = getActiveRows(state);
  const selectedRow = getSelectedRow(state);
  const pendingCount = getPendingCount(state);
  const connected = device.status === 'connected' && device.configFound;
  const locked = selectedRow ? state.layer === 'fn' && FN_LOCKED.has(selectedRow.idx) : false;

  const sendRows = useCallback(
    async (rowsToSend: readonly EditorRow[], layer: Layer, afterState: EditorState) => {
      if (!transfer) {
        log('Connect the keyboard first.', 'warn');
        return false;
      }
      if (busyRef.current) return false;

      busyRef.current = true;
      setBusy(true);

      try {
        const table = buildTable(rowsToSend, { layerFn: layer === 'fn' });
        const result = await transfer.sendTable(table, layer);

        if (result.busy) {
          log('A transfer is already running.', 'warn');
          return false;
        }

        if (isTransportFailed(result.steps)) {
          log('The keyboard refused the transfer. Nothing was written.', 'err');
          return false;
        }

        const commit = result.steps.find((step) => step.step === 'commit');
        const status = commit?.reply.status ?? null;

        if (status === STATUS.ok) {
          dispatch({ type: 'replace', state: afterState });

          if (layer === 'fn') {
            if (storage) {
              try {
                saveFnOverrides(storage, afterState.fn);
              } catch {
                log('Could not remember the Fn overrides in this browser.', 'warn');
              }
            } else {
              log('This browser cannot remember Fn overrides.', 'warn');
            }
          }

          log(`Upload accepted. The ${layer === 'fn' ? 'Fn layer' : 'top layer'} is live.`, 'ok');
          return true;
        }

        log(
          `Upload rejected (${status === null ? 'no reply' : `0x${hex([status])}`}). Nothing was applied.`,
          'err',
        );
        return false;
      } catch (error) {
        log(`Upload failed: ${error instanceof Error ? error.message : String(error)}`, 'err');
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [dispatch, log, storage, transfer],
  );

  const handleUsage = useCallback(
    (usage: number, media: boolean) => {
      if (busyRef.current) return false;
      const check = validateUsage(state, usage, media);
      if (!check.ok) {
        log(check.message, 'warn');
        return false;
      }
      dispatch({ type: 'usage', usage, media });
      return true;
    },
    [log, state],
  );

  const handleReset = useCallback(() => {
    if (busyRef.current) return;
    dispatch({ type: 'reset-selected' });
  }, []);

  const handleLayer = useCallback((layer: Layer) => {
    if (busyRef.current) return;
    dispatch({ type: 'layer', layer });
  }, []);

  const handleSelect = useCallback((idx: number) => {
    if (busyRef.current) return;
    dispatch({ type: 'select', idx });
  }, []);

  const handleUpload = useCallback(() => {
    if (!transfer || busyRef.current || pendingCount === 0) return;
    const after = editorReducer(state, { type: 'uploaded' });
    void sendRows(getActiveRows(state), state.layer, after);
  }, [pendingCount, sendRows, state, transfer]);

  const handleRestore = useCallback(() => {
    if (!transfer || busyRef.current) return;
    setConfirming(true);
  }, [transfer]);

  const handleConfirmRestore = useCallback(() => {
    if (!transfer || busyRef.current) return;
    setConfirming(false);

    const restored = editorReducer(state, { type: 'restore-layer' });
    dispatch({ type: 'replace', state: restored });
    const after = editorReducer(restored, { type: 'uploaded' });
    void sendRows(getActiveRows(restored), restored.layer, after);
  }, [sendRows, state, transfer]);

  const handleCancelRestore = useCallback(() => setConfirming(false), []);

  const handleSendTime = useCallback(
    async (at: Date) => {
      if (!transfer) {
        log('Connect the keyboard first.', 'warn');
        return;
      }
      if (busyRef.current) return;

      busyRef.current = true;
      setBusy(true);
      setTimeStatus({ kind: 'idle' });

      try {
        const result = await transfer.sendTime(at);

        if (result.busy) {
          log('A transfer is already running.', 'warn');
          return;
        }

        if (isTransportFailed(result.steps)) {
          setTimeStatus({
            kind: 'err',
            message: 'The keyboard refused the time. Nothing changed.',
          });
          log('The keyboard refused the time. Nothing changed.', 'err');
          return;
        }

        const commit = result.steps.find((step) => step.step === 'commit');
        const status = commit?.reply.status ?? null;

        if (status === STATUS.ok) {
          setTimeStatus({ kind: 'ok', at });
          log(`Time sent. The screen clock is set to ${formatClock(at)}.`, 'ok');
          return;
        }

        setTimeStatus({
          kind: 'err',
          message:
            status === null
              ? 'No reply from the keyboard. Nothing changed.'
              : 'The keyboard refused the time. Nothing changed.',
        });
        log(
          `Time rejected (${status === null ? 'no reply' : `0x${hex([status])}`}). Nothing changed.`,
          'err',
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setTimeStatus({ kind: 'err', message: 'The time could not be sent. Nothing changed.' });
        log(`Time failed: ${message}`, 'err');
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [log, transfer],
  );

  const handleSendImage = useCallback(
    async (frame: Uint8Array) => {
      if (!transfer) {
        log('Connect the keyboard first.', 'warn');
        return;
      }
      if (busyRef.current) return;

      busyRef.current = true;
      setBusy(true);
      setImageStatus({ kind: 'idle' });
      setImageProgress(null);

      try {
        const payload = buildAnimationPayload({ frames: [frame], delaysMs: [100] });
        const result = await transfer.sendAnimation(payload, (sent, total) => {
          setImageProgress({ sent, total });
        });

        if (result.busy) {
          log('A transfer is already running.', 'warn');
          return;
        }

        if (isTransportFailed(result.steps)) {
          setImageStatus({
            kind: 'err',
            message: 'The upload stopped before the commit. The screen may show part of the image.',
          });
          log('The screen upload stopped early. The commit was not sent.', 'err');
          return;
        }

        const commit = result.steps.find((step) => step.step === 'commit');
        const status = commit?.reply.status ?? null;

        if (status === STATUS.ok) {
          setImageStatus({ kind: 'ok', message: 'Sent. The screen is showing the image.' });
          log('Screen image sent. The image is live.', 'ok');
          return;
        }

        setImageStatus({
          kind: 'err',
          message: 'The keyboard refused the image. The old animation should still be on screen.',
        });
        log(
          `Screen image rejected (${
            status === null ? 'no reply' : `0x${hex([status])}`
          }). The old animation should still be live.`,
          'err',
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setImageStatus({ kind: 'err', message: 'The image could not be sent. Nothing changed.' });
        log(`Screen upload failed: ${message}`, 'err');
      } finally {
        busyRef.current = false;
        setBusy(false);
        setImageProgress(null);
      }
    },
    [log, transfer],
  );

  const handleOpenAdvanced = useCallback(() => {
    if (!connected || busyRef.current) return;
    setAdvancedOpen(true);
  }, [connected]);

  const handleCloseAdvanced = useCallback(() => setAdvancedOpen(false), []);

  const handleAdvancedBusy = useCallback((value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  }, []);

  const handleConnect = useCallback(() => {
    void device.connect();
  }, [device]);

  const handleDisconnect = useCallback(() => {
    void device.disconnect();
  }, [device]);

  const banner = !device.supported
    ? 'WebHID is not available in this browser. Use Chrome, Edge or Opera on desktop.'
    : device.error
      ? device.error
      : device.status === 'connected' && !device.configFound
        ? 'The configuration interface was not found. Use USB mode and close the vendor app.'
        : null;

  return (
    <div className="flex min-h-screen flex-col bg-ink text-ivory">
      <AppHeader
        device={device}
        supported={device.supported}
        busy={busy}
        logOpen={logOpen}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onAdvanced={handleOpenAdvanced}
        advancedDisabled={!connected || busy}
        onToggleLog={() => setLogOpen((open) => !open)}
      />

      {banner ? (
        <div className="border-b border-rust/40 bg-rust/10 px-4 py-2 text-sm text-rust">
          {banner}
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6">
        <ViewTabs view={view} disabled={busy} onChange={setView} />

        <div
          className={cn(
            'mt-5 grid content-start gap-5',
            view === 'keys'
              ? 'lg:grid-cols-[minmax(0,1fr)_340px]'
              : 'lg:grid-cols-[minmax(0,440px)_340px] lg:justify-center',
          )}
        >
          {view === 'keys' ? (
            <>
              <section className="flex min-w-0 flex-col gap-4">
                <LayerTabs layer={state.layer} disabled={busy} onChange={handleLayer} />
                <KeymapBoard
                  rows={rows}
                  layer={state.layer}
                  selected={state.selected}
                  disabled={busy}
                  onSelect={handleSelect}
                />
                <PendingBar
                  layer={state.layer}
                  pendingCount={pendingCount}
                  connected={connected}
                  busy={busy}
                  confirming={confirming}
                  onUpload={handleUpload}
                  onRestore={handleRestore}
                  onConfirmRestore={handleConfirmRestore}
                  onCancelRestore={handleCancelRestore}
                />
              </section>

              <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
                <KeyInspector
                  row={selectedRow}
                  layer={state.layer}
                  locked={locked}
                  disabled={busy}
                  onUsage={handleUsage}
                  onReset={handleReset}
                  onInvalid={(message) => log(message, 'warn')}
                />
                <WriteRules />
              </div>
            </>
          ) : (
            <ScreenPanel
              connected={connected}
              screenReady={device.screenFound}
              busy={busy}
              status={timeStatus}
              imageStatus={imageStatus}
              imageProgress={imageProgress}
              onSend={handleSendTime}
              onSendImage={handleSendImage}
            />
          )}
        </div>
      </main>

      <LogPanel
        entries={entries}
        open={logOpen}
        onToggle={() => setLogOpen((open) => !open)}
        onClear={clearLog}
      />

      <AdvancedDrawer
        open={advancedOpen}
        device={device.device}
        log={log}
        onClose={handleCloseAdvanced}
        onBusyChange={handleAdvancedBusy}
      />
    </div>
  );
}
