import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Layer } from '@/lib/editor';

const layers = [
  { id: 'top', label: 'Top layer', note: 'The full table the keyboard types without Fn.' },
  {
    id: 'fn',
    label: 'Fn layer',
    note: 'Only the keys you change are sent. Every other Fn combination stays with the firmware. Overrides are remembered in this browser.',
  },
] as const;

type LayerTabsProps = {
  layer: Layer;
  disabled: boolean;
};

export function LayerTabs({ layer, disabled }: LayerTabsProps) {
  const active = layers.find((item) => item.id === layer) ?? layers[0];

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
      <TabsList aria-label="Layer">
        {layers.map((item) => (
          <TabsTrigger key={item.id} value={item.id} disabled={disabled}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <p className="max-w-md text-xs text-muted sm:text-right">{active.note}</p>
    </div>
  );
}
