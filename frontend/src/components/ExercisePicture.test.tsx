// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { exerciseById } from '../domain/exerciseLibrary';
import { ExercisePicture, ExerciseThumb } from './ExercisePicture';

afterEach(cleanup);

describe('ExercisePicture', () => {
  it('shows the picture lazily with a description and the start / end labels', () => {
    render(<ExercisePicture exercise={exerciseById('leg-press')}/>);
    const img = screen.getByRole('img', { name: /Ảnh hướng dẫn Đạp đùi với máy/ }) as HTMLImageElement;
    expect([img.getAttribute('src'), img.getAttribute('loading')]).toEqual(['/art/exercises/leg-press.jpg', 'lazy']);
    expect(screen.queryByRole('note')).toBeNull();
  });
  it('replaces a picture that fails to load with the equipment placeholder, never a broken image', () => {
    render(<ExercisePicture exercise={exerciseById('leg-press')}/>);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img', { name: /Ảnh hướng dẫn/ })).toBeNull();
    expect(screen.getByRole('note').textContent).toContain('Máy đạp đùi');
  });
  it('names the equipment when the exercise has no picture; the compact form is one short line', () => {
    const { rerender } = render(<ExercisePicture exercise={exerciseById('bench-press')}/>);
    expect(screen.getByRole('note').textContent).toContain('Thanh đòn, ghế phẳng');
    expect(screen.getByRole('note').textContent).toContain('Chưa có ảnh động tác');
    rerender(<ExercisePicture exercise={exerciseById('bench-press')} compact/>);
    expect(screen.getByRole('note').textContent).toBe('Thanh đòn, ghế phẳngChưa có ảnh');
  });
});

describe('ExerciseThumb', () => {
  it('is decorative: a small lazy image when there is one, an icon when there is none or it fails', () => {
    const { container, rerender } = render(<ExerciseThumb exercise={exerciseById('push-up')} size={40}/>);
    const img = container.querySelector('img')!;
    expect([img.getAttribute('alt'), img.getAttribute('loading'), container.querySelector('.xt')!.getAttribute('aria-hidden')]).toEqual(['', 'lazy', 'true']);
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull(); expect(container.querySelector('svg')).toBeTruthy();
    rerender(<ExerciseThumb exercise={exerciseById('bench-press')} size={40}/>);
    expect(container.querySelector('img')).toBeNull(); expect(container.querySelector('svg')).toBeTruthy();
  });
});
