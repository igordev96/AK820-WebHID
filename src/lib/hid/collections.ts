import { CONFIG_USAGE, CONFIG_USAGE_PAGE, SCREEN_USAGE, SCREEN_USAGE_PAGE } from './protocol';

export type CollectionReport = {
  readonly reportId: number;
  readonly items: readonly unknown[];
};

export type CollectionNode = {
  readonly usagePage: number;
  readonly usage: number;
  readonly children?: readonly CollectionNode[];
  readonly inputReports?: readonly CollectionReport[];
  readonly outputReports?: readonly CollectionReport[];
  readonly featureReports?: readonly CollectionReport[];
};

export type FlatCollection = {
  readonly collection: CollectionNode;
  readonly depth: number;
};

export function flattenCollections(
  collections: readonly CollectionNode[],
  depth = 0,
  out: FlatCollection[] = [],
): FlatCollection[] {
  for (const collection of collections) {
    out.push({ collection, depth });
    if (collection.children?.length) {
      flattenCollections(collection.children, depth + 1, out);
    }
  }
  return out;
}

export function findConfigCollection(device: {
  collections: readonly CollectionNode[];
}): CollectionNode | null {
  const match = flattenCollections(device.collections).find(
    ({ collection }) =>
      collection.usagePage === CONFIG_USAGE_PAGE && collection.usage === CONFIG_USAGE,
  );
  return match?.collection ?? null;
}

export function findScreenCollection(device: {
  collections: readonly CollectionNode[];
}): CollectionNode | null {
  const match = flattenCollections(device.collections).find(
    ({ collection }) =>
      collection.usagePage === SCREEN_USAGE_PAGE && collection.usage === SCREEN_USAGE,
  );
  return match?.collection ?? null;
}
