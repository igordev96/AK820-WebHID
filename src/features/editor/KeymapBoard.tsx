import { useEffect, useRef, useState } from 'react';
import type { EditorRow, Layer } from '@/lib/editor';
import { FN_LOCKED, usageLabel } from '@/lib/keymap';
import { cn } from '@/lib/utils';
import { isSymbolLabel, keycapLabel } from './keyLabels';

const BOARD_WIDTH = 624;
const BOARD_HEIGHT = 250;
const MAX_SCALE = 1.45;
const MIN_SCALE = 0.6;

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
    <div className="rounded-panel border border-line bg-surface p-2 sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] text-muted">
          {layer === 'fn' ? 'Fn layer' : 'Top layer'}, {rows.length} keys
        </p>
        <p className="font-mono text-[10px] text-muted/70">624 × 250</p>
      </div>

      <div
        ref={container}
        className="bench-mat overflow-hidden rounded-[8px] border border-line/70 p-2 sm:p-3"
      >
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
                const label = keycapLabel(row.name);

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
                      'absolute flex items-center justify-center overflow-hidden rounded-key border px-[2px] text-center leading-none transition-colors',
                      locked
                        ? 'cursor-not-allowed border-line/50 bg-surface/50 text-muted/35'
                        : cn(
                            'bg-keycap text-ivory',
                            'shadow-[inset_0_-2px_0_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]',
                            'hover:border-brass/60 hover:text-brass-bright',
                          ),
                      !locked && custom && 'border-brass/45 text-brass',
                      !locked && pending && 'border-brass/70',
                      isSelected &&
                        !locked &&
                        'border-brass bg-brass/10 text-brass-bright ring-1 ring-brass/40',
                      row.name === 'Fn' && !locked && !isSelected && 'border-brass/40 text-brass',
                    )}
                    style={{
                      left: row.x,
                      top: row.y,
                      width: row.w,
                      height: row.h,
                    }}
                    onClick={() => onSelect(row.idx)}
                  >
                    <span
                      className={cn(
                        'whitespace-nowrap',
                        isSymbolLabel(label) ? 'font-mono' : 'font-medium',
                        label.length >= 5
                          ? 'text-[8px]'
                          : label.length === 4
                            ? 'text-[9px]'
                            : 'text-[10px]',
                      )}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line/60 px-1 pt-2 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[2px] border border-brass/50 bg-brass/10"
            aria-hidden="true"
          />
          Changed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] ring-1 ring-brass/60" aria-hidden="true" />
          Pending upload
        </span>
        {layer === 'fn' ? (
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-[2px] border border-dashed border-line bg-surface/40"
              aria-hidden="true"
            />
            Firmware-owned: {FN_LOCKED.size}
          </span>
        ) : null}
        {selected === null ? (
          <span className="ml-auto hidden text-muted/70 sm:inline">
            Select a key to edit its usage
          </span>
        ) : null}
      </div>
    </div>
  );
}
