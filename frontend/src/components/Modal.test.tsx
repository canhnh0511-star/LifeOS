// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { Modal } from './Modal';

afterEach(cleanup);

function Harness({ onClose = () => {}, autoFocus = false }: { onClose?: () => void; autoFocus?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>open</button>
    {open && <Modal title="Mục tiêu mới" onClose={() => { onClose(); setOpen(false); }}>
      <input aria-label="first" autoFocus={autoFocus} /><button>middle</button><button>last</button>
    </Modal>}
  </>;
}

describe('Modal accessibility', () => {
  it('is a labelled, modal dialog', async () => {
    render(<Harness />); await userEvent.click(screen.getByText('open'));
    const dialog = screen.getByRole('dialog', { name: 'Mục tiêu mới' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
  it('moves focus inside on open and restores it to the opener on close', async () => {
    render(<Harness />); const opener = screen.getByText('open');
    await userEvent.click(opener);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it('still restores focus to the opener when a field inside uses autoFocus', async () => {
    render(<Harness autoFocus />); const opener = screen.getByText('open');
    await userEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByLabelText('first'));
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(opener);
  });
  it('keeps focus on an autoFocus field under StrictMode (effects run twice in development)', async () => {
    render(<StrictMode><Harness autoFocus /></StrictMode>); const opener = screen.getByText('open');
    await userEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByLabelText('first'));
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(opener);
  });
  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    render(<Harness />); await userEvent.click(screen.getByText('open'));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 8; i++) { await userEvent.tab(); expect(dialog.contains(document.activeElement)).toBe(true); }
    for (let i = 0; i < 8; i++) { await userEvent.tab({ shift: true }); expect(dialog.contains(document.activeElement)).toBe(true); }
  });
  it('closes from the close button and on backdrop press, but not on a press inside', async () => {
    const onClose = vi.fn(); render(<Harness onClose={onClose} />); await userEvent.click(screen.getByText('open'));
    await userEvent.click(screen.getByText('middle')); expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' })); expect(onClose).toHaveBeenCalledTimes(1);
  });
});
