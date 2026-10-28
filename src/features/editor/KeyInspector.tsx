import { Button } from '@/components/ui/button';
import { usageToken } from '@/lib/editor';
import type { EditorRow, Layer } from '@/lib/editor';
import { MEDIA_NAMES, USAGE_GROUPS, USAGE_NAMES, parseUsageToken, usageLabel } from '@/lib/keymap';
import { cn } from '@/lib/utils';

type OptionGroup = {
  label: string;
  options: Array<{ value: string; label: string }>;
};

function buildOptionGroups(): OptionGroup[] {
  const groups: OptionGroup[] = [];

  for (const [label, low, high] of USAGE_GROUPS) {
    const options: Array<{ value: string; label: string }> = [];
    for (let usage = low; usage <= high; usage += 1) {
      const name = USAGE_NAMES.get(usage);
      if (name)
        options.push({
          value: usageToken(usage, false),
          label: `${name} (0x${usageToken(usage, false).slice(2)})`,
        });
    }
    if (options.length) groups.push({ label, options });
  }

  groups.push({
    label: 'Media',
    options: [...MEDIA_NAMES].map(([usage, name]) => ({
      value: usageToken(usage, true),
      label: `Media: ${name} (${usageToken(usage, true)})`,
    })),
  });

  groups.push({
    label: 'Vendor',
    options: [{ value: usageToken(0xaf, false), label: 'Fn (0xAF)' }],
  });

  return groups;
}

const OPTION_GROUPS = buildOptionGroups();

type KeyInspectorProps = {
  row: EditorRow | null;
  layer: Layer;
  locked: boolean;
  disabled: boolean;
  onUsage: (usage: number, media: boolean) => boolean;
  onReset: () => void;
  onInvalid: (message: string) => void;
};

export function KeyInspector({
  row,
  layer,
  locked,
  disabled,
  onUsage,
  onReset,
  onInvalid,
}: KeyInspectorProps) {
  const token = row ? usageToken(row.usage, row.media) : '0x00';

  if (!row) {
    return (
      <aside className="h-fit rounded-panel border border-line bg-surface p-4 lg:sticky lg:top-4">
        <p className="text-xs text-muted">Inspector</p>
        <p className="mt-3 text-sm font-medium">No key selected</p>
        <p className="mt-1 text-sm text-muted">Select a key on the board to edit it.</p>
      </aside>
    );
  }

  const pending = row.usage !== row.applied || row.media !== row.appliedMedia;
  const controlsDisabled = disabled || locked;
  const knownToken = OPTION_GROUPS.some((group) =>
    group.options.some((option) => option.value === token),
  );
  const isDefault = layer === 'fn' && token === '0x00';
  const custom = !knownToken && !isDefault;

  const meta =
    layer === 'fn'
      ? `Key ${row.idx}. ${
          row.usage
            ? `Override: ${usageLabel(row.usage, row.media)}.`
            : 'No override; firmware default.'
        }`
      : `Key ${row.idx}, record at offset ${row.idx * 4}. Factory: ${usageLabel(
          row.factory,
          row.factoryMedia,
        )}.`;

  const commitRaw = (input: HTMLInputElement) => {
    const parsed = parseUsageToken(input.value);
    if (!parsed) {
      onInvalid('Use a keyboard usage like 0x04, or a media usage like c:0xE2.');
      input.value = token;
      return;
    }
    const accepted = onUsage(parsed.usage, parsed.media);
    input.value = accepted ? usageToken(parsed.usage, parsed.media) : token;
  };

  return (
    <aside className="h-fit rounded-panel border border-line bg-surface p-4 lg:sticky lg:top-4">
      <p className="text-xs text-muted">Inspector</p>
      <p className="mt-3 text-sm font-medium">{layer === 'fn' ? `Fn + ${row.name}` : row.name}</p>
      <p className="mt-1 text-xs text-muted">{meta}</p>

      <div className="mt-5 space-y-1.5">
        <label htmlFor="key-usage" className="block text-xs text-muted">
          Sends
        </label>
        <select
          id="key-usage"
          value={token}
          disabled={controlsDisabled}
          className="h-9 w-full rounded-control border border-line bg-ink px-3 text-sm text-ivory disabled:cursor-not-allowed disabled:opacity-40"
          onChange={(event) => {
            const parsed = parseUsageToken(event.target.value);
            if (!parsed) {
              onInvalid('That usage could not be read.');
              return;
            }
            onUsage(parsed.usage, parsed.media);
          }}
        >
          {layer === 'fn' ? <option value="0x00">Firmware default (no override)</option> : null}
          {OPTION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
          {custom ? (
            <option value={token}>
              {usageLabel(row.usage, row.media)} ({token})
            </option>
          ) : null}
        </select>
      </div>

      <div className="mt-4 space-y-1.5">
        <label htmlFor="key-raw" className="block text-xs text-muted">
          Raw usage
        </label>
        <input
          id="key-raw"
          key={token}
          defaultValue={token}
          spellCheck={false}
          disabled={controlsDisabled}
          className="h-9 w-full rounded-control border border-line bg-ink px-3 font-mono text-xs text-ivory disabled:cursor-not-allowed disabled:opacity-40"
          onBlur={(event) => commitRaw(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <span role="status" className={cn('text-xs', pending ? 'text-brass' : 'text-muted')}>
          {locked ? 'Firmware-owned' : pending ? 'Change pending' : 'Matches the keyboard'}
        </span>
        <Button variant="ghost" size="sm" disabled={controlsDisabled} onClick={onReset}>
          {layer === 'fn' ? 'Back to firmware default' : 'Reset this key'}
        </Button>
      </div>

      {locked ? (
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          The vendor layout marks this key fnlayer_disable. The firmware owns that Fn combination,
          so it has no slot here.
        </p>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Keyboard usages use 0x00 to 0xFF. Media usages use c:0xE2, c:0xE9 and so on, because 0xE2
          alone is Left Alt.
        </p>
      )}
    </aside>
  );
}
