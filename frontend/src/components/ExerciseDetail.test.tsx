// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { exerciseById } from '../domain/exerciseLibrary';
import { ExerciseDetail } from './ExerciseDetail';

afterEach(cleanup);

describe('exercise detail teaches the movement', () => {
  it('shows the guide one part at a time in tabs: steps first, then setup, breathing and common mistakes', async () => {
    render(<ExerciseDetail exercise={exerciseById('goblet-squat')} onClose={() => {}}/>);
    const tabs = screen.getByRole('tablist', { name: 'Hướng dẫn tập' });
    expect(within(tabs).getAllByRole('tab').map(t => t.textContent)).toEqual(['Cách tập', 'Chuẩn bị', 'Hít thở', 'Lỗi thường gặp']);
    expect(within(tabs).getByRole('tab', { name: 'Cách tập' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Cách tập' })).toBeTruthy();
    expect(within(screen.getByRole('tabpanel')).getAllByRole('listitem').length).toBeGreaterThan(2);
    for (const h of ['Chuẩn bị', 'Hít thở', 'Lỗi thường gặp']) {
      await userEvent.click(within(tabs).getByRole('tab', { name: h }));
      expect(screen.getByRole('heading', { name: h })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: 'Cách tập' })).toBeNull();
    }
    expect(screen.queryByText(/đang được biên soạn/)).toBeNull();
  });
  it('moves between tabs with the arrow keys', async () => {
    render(<ExerciseDetail exercise={exerciseById('goblet-squat')} onClose={() => {}}/>);
    screen.getByRole('tab', { name: 'Cách tập' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Chuẩn bị' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Lỗi thường gặp' }).getAttribute('aria-selected')).toBe('true');
  });
  it('names the exercise in Vietnamese and English with its level, and the plan numbers in the stats card', () => {
    render(<ExerciseDetail exercise={exerciseById('goblet-squat')} onClose={() => {}}/>);
    expect(screen.getByRole('heading', { name: /Squat ôm tạ trước ngực/ })).toBeTruthy();
    expect(screen.getByText('Goblet Squat')).toBeTruthy();
    expect(screen.getByText(/Độ khó: Dễ/)).toBeTruthy();
    expect(screen.getByText(/2 set × 10 rep/)).toBeTruthy();
  });
  it('says the guide is being written, and still shows the short cues, for an exercise without one', () => {
    render(<ExerciseDetail exercise={exerciseById('bench-press')} onClose={() => {}}/>);
    expect(screen.getByText(/Hướng dẫn chi tiết cho bài này đang được biên soạn/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Kỹ thuật' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Cách tập' })).toBeNull();
  });
  it('shows the instruction picture when the exercise has one', () => {
    render(<ExerciseDetail exercise={exerciseById('plank')} onClose={() => {}}/>);
    const img = screen.getByRole('img', { name: /Ảnh hướng dẫn/ }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/art/exercises/plank.jpg');
    expect(screen.queryByText(/Chưa có ảnh động tác/)).toBeNull();
    expect(screen.getByText(/Đau nhói/)).toBeTruthy();
  });
  it('puts the picture first, above the muscle facts, with the start and end poses named', () => {
    render(<ExerciseDetail exercise={exerciseById('leg-press')} onClose={() => {}}/>);
    const region = screen.getByRole('region', { name: /Chi tiết/ });
    const figure = region.querySelector('figure.xd-pic')!, facts = region.querySelector('.xd-top')!;
    expect(region.firstElementChild).toBe(figure);
    expect(figure.compareDocumentPosition(facts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(figure.textContent).toContain('Bắt đầu'); expect(figure.textContent).toContain('Kết thúc');
  });
  it('names the equipment in the placeholder when there is no picture', () => {
    render(<ExerciseDetail exercise={exerciseById('bench-press')} onClose={() => {}}/>);
    expect(screen.getByRole('note').textContent).toContain('Thanh đòn, ghế phẳng');
  });
  it('falls back to a text note when the exercise has no picture', () => {
    render(<ExerciseDetail exercise={exerciseById('bench-press')} onClose={() => {}}/>);
    expect(screen.getByText(/Chưa có ảnh động tác/)).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Ảnh hướng dẫn/ })).toBeNull();
  });
});
