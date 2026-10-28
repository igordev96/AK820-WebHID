import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildWebHidFilters, pickDevice, type WebHid, type WebHidDevice } from '@/lib/hid';
import { useDevice } from './useDevice';

function makeDevice(overrides: Partial<WebHidDevice> = {}) {
  const listeners: Array<() => void> = [];
  const device: WebHidDevice = {
    opened: false,
    productName: 'AK820',
    vendorId: 0x0c45,
    productId: 0x8009,
    collections: [{ usagePage: 0xff13, usage: 0x0001 }],
    open: async () => {},
    close: vi.fn(async () => {}),
    sendFeatureReport: async () => {},
    receiveFeatureReport: async () => new DataView(new ArrayBuffer(64)),
    addEventListener: (_type, listener) => {
      listeners.push(listener);
    },
    removeEventListener: () => {},
    ...overrides,
  };
  return { device, listeners };
}

function makeHid(devices: WebHidDevice[]): WebHid {
  return {
    requestDevice: vi.fn(async () => devices),
    getDevices: vi.fn(async () => []),
  };
}

describe('WebHID device helpers', () => {
  it('builds filters for both the config usage and each product id', () => {
    const filters = buildWebHidFilters();
    expect(filters).toHaveLength(6);
    expect(filters[0]).toMatchObject({ vendorId: 0x0c45, productId: 0x8009, usagePage: 0xff13 });
    expect(filters[5]).toMatchObject({ vendorId: 0x0c45, productId: 0xfdfd });
  });

  it('picks the device with the config collection', () => {
    const { device: plain } = makeDevice({ collections: [] });
    const { device: config } = makeDevice();

    expect(pickDevice([plain, config])).toBe(config);
    expect(pickDevice([])).toBeNull();
  });
});

describe('useDevice', () => {
  it('opens the selected device and exposes its state', async () => {
    const { device } = makeDevice();
    const hid = makeHid([device]);
    const log = vi.fn();
    const { result } = renderHook(() => useDevice({ hid, log }));

    expect(result.current.supported).toBe(true);

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.device).toBe(device);
    expect(result.current.name).toBe('AK820');
    expect(result.current.configFound).toBe(true);
    expect(hid.requestDevice).toHaveBeenCalledWith({ filters: buildWebHidFilters() });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('selected AK820'), 'ok');
  });

  it('returns to idle when the device disconnects', async () => {
    const { device, listeners } = makeDevice();
    const { result } = renderHook(() => useDevice({ hid: makeHid([device]), log: vi.fn() }));

    await act(async () => {
      await result.current.connect();
    });
    act(() => listeners[0]?.());

    expect(result.current.status).toBe('idle');
    expect(result.current.device).toBeNull();
  });

  it('closes the device on disconnect', async () => {
    const { device } = makeDevice();
    const { result } = renderHook(() => useDevice({ hid: makeHid([device]), log: vi.fn() }));

    await act(async () => {
      await result.current.connect();
    });
    await act(async () => {
      await result.current.disconnect();
    });

    expect(device.close).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('reports a missing config interface but keeps the device open', async () => {
    const { device } = makeDevice({ collections: [{ usagePage: 0x0001, usage: 0x0006 }] });
    const { result } = renderHook(() => useDevice({ hid: makeHid([device]), log: vi.fn() }));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.configFound).toBe(false);
  });

  it('reports a permission or open failure', async () => {
    const hid: WebHid = {
      requestDevice: vi.fn(async () => {
        throw new Error('permission denied');
      }),
      getDevices: vi.fn(async () => []),
    };
    const { result } = renderHook(() => useDevice({ hid, log: vi.fn() }));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('permission denied');
  });

  it('treats a cancelled chooser as idle', async () => {
    const hid = makeHid([]);
    const log = vi.fn();
    const { result } = renderHook(() => useDevice({ hid, log }));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('idle');
    expect(log).toHaveBeenCalledWith('no device selected', 'warn');
  });
});
