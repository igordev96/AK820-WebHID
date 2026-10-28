export type FactoryKey = {
  readonly idx: number;
  readonly usage: number;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type KeyEntry = {
  readonly idx: number;
  readonly usage: number;
  readonly media?: boolean;
};

export type MapEntry = {
  readonly idx: number;
  readonly usage: number;
  readonly media: boolean;
  readonly name: string;
};

export type RecordType = 0x02 | 0x03;

export type KeyRecord = readonly [type: RecordType, byte1: number, byte2: number, byte3: number];
