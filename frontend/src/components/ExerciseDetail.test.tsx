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
  it('always has a picture slot with a text fallback and a safety note', () => {
    render(<ExerciseDetail exercise={exerciseById('plank')} onClose={() => {}}/>);
    expect(screen.getByText(/Chưa có ảnh động tác/)).toBeTruthy();
    expect(screen.getByText(/Đau nhói/)).toBeTruthy();
  });
});
