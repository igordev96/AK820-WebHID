import { TabRow } from '@/components/tab-row';
import type { View } from '@/lib/settings';

export type { View };

const views = [
  { id: 'keys', label: 'Keys', note: 'Remap keys on the top and Fn layers.' },
  { id: 'screen', label: 'Screen', note: 'Set the clock and play GIFs on the keyboard screen.' },
  { id: 'light', label: 'Lighting', note: 'Set the colour and brightness of the keys.' },
] as const;

type ViewTabsProps = {
  view: View;
  disabled: boolean;
};

export function ViewTabs({ view, disabled }: ViewTabsProps) {
  const active = views.find((item) => item.id === view) ?? views[0];

  return <TabRow label="View" items={views} note={active.note} disabled={disabled} />;
}
