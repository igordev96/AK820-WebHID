import { useEffect, useRef, useState } from 'react';
import type { EditorRow, Layer } from '@/lib/editor';
import { FN_LOCKED, usageLabel } from '@/lib/keymap';
import { cn } from '@/lib/utils';

const BOARD_WIDTH = 624;
const BOARD_HEIGHT = 250;
const MAX_SCALE = 1.3;
const MIN_SCALE = 0.6;

const KM_LABEL: Record<string, string> = {
  Esc: 'Esc',
  Delete: 'Del',
  home: 'Home',
  PgUp: 'PgUp',
  PgDn: 'PgDn',
  CapsLock: 'Caps',
  Backspace: 'Bksp',
  PrintScreen: 'PrtSc',
  ScrollLock: 'ScrLk',
  Shift_L: 'Shift',
  Shift_R: 'Shift',
  Ctrl_L: 'Ctrl',
  Ctrl_R: 'Ctrl',
  Alt_L: 'Alt',
  Alt_R: 'Alt',
  Win_L: 'Win',
};

const labelFor = (name: string) => KM_LABEL[name] ?? name;

type KeymapBoardProps = {
  rows: readonly EditorRow[];
  layer: Layer;
  selected: number | null;
  disabled: boolean;
  onSelect: (idx: number) => void;
};

export function KeymapBoard({ rows, layer, selected, disabled, onSelect }: KeymapBoardProps) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width <= 0) return;
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / BOARD_WIDTH)));
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="rounded-panel border border-line bg-surface p-2 sm:p-3">
      <div className="overflow-x-auto">
        <div
          className="mx-auto"
          style={{ width: BOARD_WIDTH * scale, height: BOARD_HEIGHT * scale }}
        >
          <div
            className="relative"
            style={{
              width: BOARD_WIDTH,
              height: BOARD_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            role="group"
            aria-label="Keyboard board"
          >
            {rows.map((row) => {
              const locked = layer === 'fn' && FN_LOCKED.has(row.idx);
              const pending = row.usage !== row.applied || row.media !== row.appliedMedia;
              const custom = row.usage !== row.factory || row.media !== row.factoryMedia;
              const isSelected = selected === row.idx;

              const title = locked
                ? `${row.name}. Key index ${row.idx}. The firmware owns this Fn combination.`
                : layer === 'fn'
                  ? `Fn + ${row.name}. Key index ${row.idx}. ${
                      row.usage ? usageLabel(row.usage, row.media) : 'Firmware default'
                    }.`
                  : `${row.name}. Key index ${row.idx}. Sends ${usageLabel(
                      row.usage,
                      row.media,
                    )}.${custom ? ` Factory: ${usageLabel(row.factory, row.factoryMedia)}.` : ''}`;

              return (
                <button
                  key={row.idx}
                  type="button"
                  aria-label={row.name}
                  aria-pressed={isSelected}
                  disabled={locked || disabled}
                  title={title}
                  className={cn(
                    'absolute flex items-center justify-center overflow-hidden rounded-key border px-1 text-center text-[10px] font-medium leading-none shadow-[inset_0_-2px_0_rgba(0,0,0,0.45)] transition-colors',
                    locked
                      ? 'cursor-not-allowed border-line/60 bg-surface/60 text-muted/40'
                      : 'bg-keycap text-ivory hover:border-brass/60 hover:bg-surface-2',
                    !locked && custom && 'border-brass/50 text-brass',
                    !locked && pending && 'ring-1 ring-brass/50',
                    isSelected && !locked && 'border-brass bg-surface-2 ring-2 ring-brass/30',
                  )}
                  style={{
                    left: row.x,
                    top: row.y,
                    width: row.w,
                    height: row.h,
                  }}
                  onClick={() => onSelect(row.idx)}
                >
                  {labelFor(row.name)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
