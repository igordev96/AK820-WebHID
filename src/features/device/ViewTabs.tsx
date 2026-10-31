import { TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
      <TabsList aria-label="View">
        {views.map((item) => (
          <TabsTrigger key={item.id} value={item.id} disabled={disabled}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <p className="max-w-md text-xs text-muted sm:text-right">{active.note}</p>
    </div>
  );
}
