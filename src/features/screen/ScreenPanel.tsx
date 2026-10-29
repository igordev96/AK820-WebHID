import { useEffect, useState } from 'react';
import { ClockCard, type ClockMode, type TimeStatus } from './ClockCard';
import { ImageCard, type ImageStatus } from './ImageCard';
import { ScreenPreview } from './ScreenPreview';

type ScreenPanelProps = {
  connected: boolean;
  screenReady: boolean;
  busy: boolean;
  status: TimeStatus;
  imageStatus: ImageStatus;
  imageProgress: { readonly sent: number; readonly total: number } | null;
  onSend: (at: Date) => void;
  onSendImage: (frame: Uint8Array) => void;
};

export function ScreenPanel({
  connected,
  screenReady,
  busy,
  status,
  imageStatus,
  imageProgress,
  onSend,
  onSendImage,
}: ScreenPanelProps) {
  const [mode, setMode] = useState<ClockMode>('now');
  const [now, setNow] = useState(() => new Date());
  const [customAt, setCustomAt] = useState<Date | null>(null);

  useEffect(() => {
    if (mode !== 'now') return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  const preview = mode === 'now' ? now : (customAt ?? now);

  const changeMode = (next: ClockMode) => {
    setMode(next);
    if (next === 'custom' && customAt === null) setCustomAt(new Date());
  };

  const send = () => {
    const at = mode === 'now' ? new Date() : (customAt ?? new Date());
    onSend(at);
  };

  return (
    <>
      <section className="flex min-w-0 flex-col gap-4">
        <ScreenPreview time={preview} connected={connected} />
        <p className="max-w-prose text-xs leading-relaxed text-muted">
          One write sets the clock. Nothing else on the keyboard changes, and no key mapping is
          touched.
        </p>
      </section>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <ClockCard
          mode={mode}
          preview={preview}
          connected={connected}
          busy={busy}
          status={status}
          onModeChange={changeMode}
          onCustomChange={setCustomAt}
          onSend={send}
        />
        <ImageCard
          connected={connected}
          screenReady={screenReady}
          busy={busy}
          status={imageStatus}
          progress={imageProgress}
          onSend={onSendImage}
        />
      </div>
    </>
  );
}
