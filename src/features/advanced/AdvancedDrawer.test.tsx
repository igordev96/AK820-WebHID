import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { WebHidDevice } from '@/lib/hid';
import { FakeClock } from '@/test/hidFakes';
import { AdvancedDrawer } from './AdvancedDrawer';

const padded = (bytes: readonly number[]) => {
  const frame = new Uint8Array(64);
  frame.set(bytes);
  return frame;
};

const reply = (cmd: number, status: number) => padded([0x04, cmd, 0x00, status]);

function makeDevice(queue: Uint8Array[] = []) {
  const sent: Uint8Array[] = [];
  const device: WebHidDevice = {
    opened: true,
    productName: 'AK820',
    vendorId: 0x0c45,
    productId: 0x8009,
    collections: [
      {
        usagePage: 0xff13,
        usage: 0x0001,
        featureReports: [{ reportId: 0, items: [] }],
      },
    ],
    open: async () => {},
    close: async () => {},
    sendFeatureReport: async (_reportId, data) => {
      sent.push(new Uint8Array(data as Uint8Array));
    },
    receiveFeatureReport: async () => {
      const bytes = queue.shift();
      if (!bytes) throw new Error('no reply');
      return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return { device, sent };
}

const renderDrawer = (device: WebHidDevice | null, onClose = vi.fn()) => {
  const log = vi.fn();
  const view = render(
    <AdvancedDrawer open device={device} log={log} clock={new FakeClock()} onClose={onClose} />,
  );
  return { ...view, log, onClose };
};

describe('AdvancedDrawer', () => {
  it('renders nothing while closed', () => {
    render(
      <AdvancedDrawer
        open={false}
        device={null}
        log={vi.fn()}
        clock={new FakeClock()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks for a keyboard when none is connected', () => {
    renderDrawer(null);

    expect(screen.getByRole('dialog', { name: 'Advanced' })).toBeInTheDocument();
    expect(screen.getByText('Connect the keyboard first.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run diagnostics/i })).toBeDisabled();
  });

  it('runs diagnostics and shows the checks', async () => {
    const user = userEvent.setup();
    const { device } = makeDevice([reply(0x19, 0x01), reply(0xf5, 0x01)]);
    renderDrawer(device);

    await user.click(screen.getByRole('button', { name: /run diagnostics/i }));

    expect(await screen.findByText(/Transport works\. Commands are written/)).toBeInTheDocument();
    expect(screen.getByText('feature write (04 18 init)')).toBeInTheDocument();
    expect(screen.getByText('feature reports')).toBeInTheDocument();
    expect(screen.getAllByText('ok').length).toBeGreaterThan(0);
  });

  it('reports a refused write', async () => {
    const user = userEvent.setup();
    const { device } = makeDevice();
    device.sendFeatureReport = async () => {
      throw new Error('feature write refused');
    };
    renderDrawer(device);

    await user.click(screen.getByRole('button', { name: /run diagnostics/i }));

    expect(await screen.findByText(/WebHID could not write to the keyboard/)).toBeInTheDocument();
  });

  it('sends a raw command and listens for replies', async () => {
    const user = userEvent.setup();
    const { device, sent } = makeDevice([reply(0x19, 0x01)]);
    renderDrawer(device);

    await user.click(screen.getByRole('tab', { name: 'Raw command' }));
    const input = screen.getByLabelText('Raw command hex');
    await user.clear(input);
    await user.type(input, '04 19 00');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('SENT 3 bytes in 1 frame(s)')).toBeInTheDocument();
    expect(sent).toHaveLength(1);
    expect(Array.from(sent[0].subarray(0, 3))).toEqual([0x04, 0x19, 0x00]);

    await user.click(screen.getByRole('button', { name: /send and listen/i }));
    expect(await screen.findByText(/FEATURE read: 04 19/)).toBeInTheDocument();
    expect(screen.getAllByText(/feature read: no reply/).length).toBeGreaterThan(0);
  });

  it('logs malformed hex without sending', async () => {
    const user = userEvent.setup();
    const { device, sent } = makeDevice();
    const { log } = renderDrawer(device);

    await user.click(screen.getByRole('tab', { name: 'Raw command' }));
    const input = screen.getByLabelText('Raw command hex');
    await user.clear(input);
    await user.type(input, '0x4');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('odd number of hex digits')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
    expect(log).toHaveBeenCalledWith('odd number of hex digits', 'err');
  });

  it('runs the deep probe and the mailbox test', async () => {
    const user = userEvent.setup();
    const { device } = makeDevice();
    renderDrawer(device);

    await user.click(screen.getByRole('tab', { name: 'Deep probe' }));
    await user.click(screen.getByRole('button', { name: /run deep probe/i }));
    expect((await screen.findAllByText(/No usable reply/)).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: 'Mailbox' }));
    await user.click(screen.getByRole('button', { name: /run mailbox test/i }));
    expect(await screen.findByText(/commit alone/)).toBeInTheDocument();
  });

  it('closes with the button and with Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer(null);

    await user.click(screen.getByRole('button', { name: 'Close advanced' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
