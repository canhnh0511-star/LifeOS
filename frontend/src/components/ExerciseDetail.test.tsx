// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { exerciseById } from '../domain/exerciseLibrary';
import { ExerciseDetail } from './ExerciseDetail';

afterEach(cleanup);

describe('exercise detail teaches the movement', () => {
  it('shows setup, numbered steps, breathing and common mistakes when a guide exists', () => {
    render(<ExerciseDetail exercise={exerciseById('goblet-squat')} onClose={() => {}}/>);
    for (const h of ['Chuẩn bị', 'Cách tập', 'Hít thở', 'Lỗi thường gặp']) expect(screen.getByRole('heading', { name: h })).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(8);
    expect(screen.queryByText(/đang được biên soạn/)).toBeNull();
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
