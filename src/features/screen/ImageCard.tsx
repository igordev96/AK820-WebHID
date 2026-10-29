import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { encodeRgb565 } from '@/lib/screen';
import { cn } from '@/lib/utils';

export type ImageStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'ok'; readonly message: string }
  | { readonly kind: 'err'; readonly message: string };

type ImageCardProps = {
  connected: boolean;
  screenReady: boolean;
  busy: boolean;
  status: ImageStatus;
  progress: { readonly sent: number; readonly total: number } | null;
  onSend: (frame: Uint8Array) => void;
};

type Picked = {
  readonly frame: Uint8Array;
  readonly url: string;
  readonly name: string;
};

const SIZE = 128;

export function ImageCard({
  connected,
  screenReady,
  busy,
  status,
  progress,
  onSend,
}: ImageCardProps) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no canvas');

      const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
      const width = bitmap.width * scale;
      const height = bitmap.height * scale;
      context.drawImage(bitmap, (SIZE - width) / 2, (SIZE - height) / 2, width, height);
      bitmap.close();

      const frame = encodeRgb565(context.getImageData(0, 0, SIZE, SIZE).data, SIZE, SIZE);

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setPicked({ frame, url, name: file.name });
    } catch {
      setError('That file could not be read as an image.');
      setPicked(null);
    }
  };

  const percent =
    progress && progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0;

  return (
    <aside className="rounded-panel border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">Send an image</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        One 128 × 128 picture. It replaces the animation on the keyboard, which this tool cannot
        read back.
      </p>

      <div className="mt-3 flex items-center gap-3">
        <label
          className={cn(
            'inline-flex h-8 cursor-pointer items-center rounded-control border border-line bg-keycap px-3 text-xs font-medium text-ivory transition-colors hover:border-muted/50',
            busy && 'pointer-events-none opacity-45',
          )}
        >
          Choose a file
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void pick(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </label>

        {picked ? (
          <img
            src={picked.url}
            alt=""
            className="size-12 rounded-key border border-line object-cover"
          />
        ) : null}
      </div>

      {picked ? (
        <p className="mt-2 truncate text-[11px] text-muted">{picked.name}, 128 × 128</p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rust">{error}</p> : null}

      <Button
        className="mt-3"
        disabled={!connected || !screenReady || busy || !picked}
        onClick={() => {
          if (picked) onSend(picked.frame);
        }}
      >
        {busy ? 'Sending…' : 'Send image'}
      </Button>

      {connected && !screenReady ? (
        <p className="mt-2 text-[11px] leading-relaxed text-rust">
          This browser did not expose the screen interface. Reconnect and allow the keyboard again.
        </p>
      ) : null}

      {progress ? (
        <div className="mt-3">
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-sage transition-[width] duration-150"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted">
            {percent}% ({progress.sent}/{progress.total} blocks)
          </p>
        </div>
      ) : null}

      <div aria-live="polite">
        {status.kind === 'ok' ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-sage">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-sage" />
            {status.message}
          </p>
        ) : null}
        {status.kind === 'err' ? (
          <p className="mt-3 flex items-start gap-2 text-xs text-rust">
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rust" />
            {status.message}
          </p>
        ) : null}
        {!connected && status.kind === 'idle' && !picked ? (
          <p className="mt-3 text-xs text-muted">Connect the keyboard to send an image.</p>
        ) : null}
      </div>
    </aside>
  );
}
