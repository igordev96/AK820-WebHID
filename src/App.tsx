import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { AdvancedDrawer } from '@/features/advanced/AdvancedDrawer';
import { AppHeader } from '@/features/device/AppHeader';
import { useDevice } from '@/features/device/useDevice';
import { KeyInspector } from '@/features/editor/KeyInspector';
import { KeymapBoard } from '@/features/editor/KeymapBoard';
import { LayerTabs } from '@/features/editor/LayerTabs';
import { PendingBar } from '@/features/editor/PendingBar';
import { WriteRules } from '@/features/editor/WriteRules';
import { LogPanel } from '@/features/log/LogPanel';
import { useLog } from '@/features/log/useLog';
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
import { HidClient, STATUS, TransferService, isTransportFailed } from '@/lib/hid';
import { FN_LOCKED, buildTable } from '@/lib/keymap';

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

  const transfer = useMemo(() => {
    if (!device.device || !device.configFound) return null;
    return new TransferService(new HidClient(device.device), realClock, log);
  }, [device.device, device.configFound, log]);

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

      <main className="mx-auto grid w-full max-w-[1320px] flex-1 content-start gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
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
