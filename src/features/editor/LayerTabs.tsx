import { TabRow } from '@/components/tab-row';
import type { Layer } from '@/lib/editor';

const layers = [
  {
    id: 'top',
    label: 'Top layer',
    note: 'The full table the keyboard types without Fn. An upload sends all 81 keys.',
  },
  {
    id: 'fn',
    label: 'Fn layer',
    note: 'Only the keys you change are sent. Every other Fn combination stays with the firmware.',
  },
] as const;

type LayerTabsProps = {
  layer: Layer;
  disabled: boolean;
};

export function LayerTabs({ layer, disabled }: LayerTabsProps) {
  const active = layers.find((item) => item.id === layer) ?? layers[0];

  return <TabRow label="Layer" items={layers} note={active.note} disabled={disabled} />;
}
