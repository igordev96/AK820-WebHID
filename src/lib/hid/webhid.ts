import { type CollectionReport, findConfigCollection, findScreenCollection } from './collections';
import { CONFIG_USAGE, CONFIG_USAGE_PAGE, PRODUCT_IDS, VENDOR_ID } from './protocol';

export type WebHidReportInfo = CollectionReport;

export type WebHidCollection = {
  readonly usagePage: number;
  readonly usage: number;
  readonly children?: readonly WebHidCollection[];
  readonly inputReports?: readonly WebHidReportInfo[];
  readonly outputReports?: readonly WebHidReportInfo[];
  readonly featureReports?: readonly WebHidReportInfo[];
};

export type WebHidFilter = {
  readonly vendorId: number;
  readonly productId?: number;
  readonly usagePage?: number;
  readonly usage?: number;
};

export type WebHidDevice = {
  readonly opened: boolean;
  readonly productName?: string;
  readonly vendorId: number;
  readonly productId: number;
  readonly collections: readonly WebHidCollection[];
  open(): Promise<void>;
  close(): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
  sendReport?(reportId: number, data: BufferSource): Promise<void>;
  addEventListener(type: 'disconnect', listener: () => void): void;
  removeEventListener(type: 'disconnect', listener: () => void): void;
};

export type WebHid = {
  requestDevice(options: { filters: readonly WebHidFilter[] }): Promise<WebHidDevice[]>;
  getDevices(): Promise<WebHidDevice[]>;
};

export function buildWebHidFilters(): WebHidFilter[] {
  const filters: WebHidFilter[] = [];

  for (const productId of PRODUCT_IDS) {
    filters.push({
      vendorId: VENDOR_ID,
      productId,
      usagePage: CONFIG_USAGE_PAGE,
      usage: CONFIG_USAGE,
    });
  }
  for (const productId of PRODUCT_IDS) {
    filters.push({ vendorId: VENDOR_ID, productId });
  }

  return filters;
}

export function pickDevice(devices: readonly WebHidDevice[]): WebHidDevice | null {
  return (
    devices.find((device) => findConfigCollection({ collections: device.collections })) ??
    devices[0] ??
    null
  );
}

export function pickScreenDevice(devices: readonly WebHidDevice[]): WebHidDevice | null {
  return (
    devices.find((device) => findScreenCollection({ collections: device.collections })) ?? null
  );
}

export function getWebHid(): WebHid | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { hid?: WebHid }).hid;
}
