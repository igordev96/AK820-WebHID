export const SLOT_MAGIC_AT = 574;
export const TABLE_SIZE = 576;
export const MAX_KEY_INDEX = 142;

// fnlayer_disable="1" in the vendor layout. The firmware owns these Fn combinations, so the
// vendor encoder never writes their slots on the Fn layer.
export const FN_LOCKED: ReadonlySet<number> = new Set([1, 67, 92, 96, 103, 117]);
