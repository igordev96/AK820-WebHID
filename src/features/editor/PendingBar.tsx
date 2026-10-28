import { Button } from '@/components/ui/button';
import type { Layer } from '@/lib/editor';

type PendingBarProps = {
  layer: Layer;
  pendingCount: number;
  connected: boolean;
  busy: boolean;
  confirming: boolean;
  onUpload: () => void;
  onRestore: () => void;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;
};

export function PendingBar({
  layer,
  pendingCount,
  connected,
  busy,
  confirming,
  onUpload,
  onRestore,
  onConfirmRestore,
  onCancelRestore,
}: PendingBarProps) {
  const canWrite = connected && !busy;
  const restoreLabel = layer === 'fn' ? 'Clear all Fn overrides' : 'Restore factory map';

  return (
    <div className="flex flex-col gap-3">
      {confirming ? (
        <div className="rounded-control border border-brass/30 bg-brass/5 p-3">
          <p className="text-sm text-ivory">
            {layer === 'fn'
              ? 'Clear every Fn override? Each key returns to the firmware default.'
              : 'Restore the factory top layer? This rewrites all 81 keys. Fn overrides stay as they are.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" disabled={!canWrite} onClick={onConfirmRestore}>
              {restoreLabel}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancelRestore}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {confirming ? null : (
          <Button
            variant="ghost"
            size="sm"
            disabled={!canWrite}
            className="self-start sm:self-auto"
            onClick={onRestore}
          >
            {restoreLabel}
          </Button>
        )}

        <div className="flex items-center justify-between gap-3 sm:ml-auto sm:justify-end">
          <span className="text-xs text-muted">
            {!connected
              ? 'Connect the keyboard to upload.'
              : pendingCount
                ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} ready`
                : 'No pending changes'}
          </span>
          <Button disabled={!canWrite || pendingCount === 0} onClick={onUpload}>
            {busy
              ? 'Uploading…'
              : pendingCount
                ? `Upload ${pendingCount} change${pendingCount === 1 ? '' : 's'}`
                : 'Upload changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
