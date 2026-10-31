import { TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabRowProps = {
  /** The accessible name of the tab list, such as "View" or "Layer". */
  label: string;
  items: readonly { readonly id: string; readonly label: string }[];
  /** The sentence beside the tabs, which describes the active one. */
  note: string;
  disabled: boolean;
};

/** A tab list with its explanatory note, shared by the view and layer switches. */
export function TabRow({ label, items, note, disabled }: TabRowProps) {
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <TabsList aria-label={label} className="shrink-0">
        {items.map((item) => (
          <TabsTrigger key={item.id} value={item.id} disabled={disabled}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <p className="min-w-0 max-w-md text-xs text-muted sm:text-right">{note}</p>
    </div>
  );
}
