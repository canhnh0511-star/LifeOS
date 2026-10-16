// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BodyPage } from './BodyPage';
import { parseNumber } from '../components/MetricCard';
import { formatChange, summarize } from '../domain/measurements';
import type { MetricDto } from '../api/types';

afterEach(cleanup);

const weight = (entries: MetricDto['entries']): MetricDto => ({ id: 'w', name: 'Cân nặng', unit: 'kg', builtin: true, entries });
const noop = async () => true;
const props = { today: '2026-10-16', busy: false, onRecord: noop, onRemoveEntry: () => {}, onCreate: noop, onDelete: () => {} };

describe('measurement helpers', () => {
  it('reads comma and dot decimals and rejects everything else', () => {
    expect([parseNumber('72,5'), parseNumber(' 72.5 '), parseNumber('72')]).toEqual([72.5, 72.5, 72]);
    expect(['', 'x', '-5', '1,2,3', '7e2', '1 2'].map(parseNumber)).toEqual([null, null, null, null, null, null]);
  });
  it('summarizes the change against the previous entry and the start of the window', () => {
    const s = summarize(weight([{ date: '2026-10-01', value: 75 }, { date: '2026-10-08', value: 74 }, { date: '2026-10-15', value: 73.5 }]));
    expect([s.latest?.value, s.previous?.value, s.change, s.sinceStart]).toEqual([73.5, 74, -0.5, -1.5]);
    const one = summarize(weight([{ date: '2026-10-15', value: 73.5 }]));
    expect([one.change, one.sinceStart]).toEqual([null, null]);
    expect(summarize(weight([])).latest).toBeNull();
  });
  it('shows a signed change with its unit', () => {
    expect(formatChange(-1.5, 'kg')).toContain('1,5');
    expect(formatChange(-1.5, 'kg')).toContain('kg');
  });
});

describe('BodyPage', () => {
  it('shows an empty metric without numbers and a saved one with its trend', () => {
    render(<BodyPage {...props} metrics={[weight([]), { ...weight([{ date: '2026-10-08', value: 74 }, { date: '2026-10-15', value: 73.5 }]), id: 'x', name: 'Vòng eo', unit: 'cm' }]}/>);
    expect(within(screen.getByLabelText('Cân nặng')).getByText('Chưa có số đo')).toBeTruthy();
    const waist = screen.getByLabelText('Vòng eo');
    expect(waist.textContent).toContain('73,5');
    expect(waist.textContent).toContain('So với lần trước');
  });
  it('saves a value typed with a comma for the chosen day and clears the field', async () => {
    const onRecord = vi.fn(async () => true);
    render(<BodyPage {...props} onRecord={onRecord} metrics={[weight([])]}/>);
    await userEvent.type(screen.getByLabelText('Giá trị Cân nặng'), '72,5');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu số đo' }));
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'w' }), '2026-10-16', 72.5);
    expect((screen.getByLabelText('Giá trị Cân nặng') as HTMLInputElement).value).toBe('');
  });
  it('refuses a non-number locally and does not call the API', async () => {
    const onRecord = vi.fn(async () => true);
    render(<BodyPage {...props} onRecord={onRecord} metrics={[weight([])]}/>);
    await userEvent.type(screen.getByLabelText('Giá trị Cân nặng'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu số đo' }));
    expect(onRecord).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('lớn hơn 0');
  });
  it('keeps what you typed when saving fails, removes an entry, and only custom metrics can be deleted after a confirm', async () => {
    const onRecord = vi.fn(async () => false); const onRemoveEntry = vi.fn(); const onDelete = vi.fn();
    const custom: MetricDto = { id: 'c', name: 'Vòng bắp tay', unit: 'cm', builtin: false, entries: [{ date: '2026-10-15', value: 35 }] };
    render(<BodyPage {...props} onRecord={onRecord} onRemoveEntry={onRemoveEntry} onDelete={onDelete} metrics={[weight([]), custom]}/>);
    await userEvent.type(screen.getByLabelText('Giá trị Cân nặng'), '70');
    await userEvent.click(within(screen.getByLabelText('Cân nặng')).getByRole('button', { name: 'Lưu số đo' }));
    expect((screen.getByLabelText('Giá trị Cân nặng') as HTMLInputElement).value).toBe('70');
    expect(within(screen.getByLabelText('Cân nặng')).queryByRole('button', { name: 'Xoá chỉ số' })).toBeNull();
    const card = screen.getByLabelText('Vòng bắp tay');
    await userEvent.click(within(card).getByText('Lịch sử gần đây'));
    await userEvent.click(within(card).getByRole('button', { name: /Xoá số đo Vòng bắp tay ngày 2026-10-15/ }));
    expect(onRemoveEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }), '2026-10-15');
    await userEvent.click(within(card).getByRole('button', { name: 'Xoá chỉ số' }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(within(card).getByRole('button', { name: 'Xoá hẳn' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });
  it('adds a custom metric from the form', async () => {
    const onCreate = vi.fn(async () => true);
    render(<BodyPage {...props} onCreate={onCreate} metrics={[weight([])]}/>);
    await userEvent.click(screen.getByRole('button', { name: /Thêm chỉ số/ }));
    await userEvent.type(screen.getByLabelText('Tên chỉ số mới'), ' Vòng đùi ');
    await userEvent.type(screen.getByLabelText('Đơn vị chỉ số mới'), 'cm');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(onCreate).toHaveBeenCalledWith('Vòng đùi', 'cm');
  });
});
