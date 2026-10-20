// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SceneArt } from './SceneArt';

afterEach(cleanup);

describe('SceneArt', () => {
  it('is a decorative picture of the scene', () => {
    const { container } = render(<SceneArt scene="LEGS"/>);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/art\/scenes\/legs\.jpg$/);
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
  it('falls back to a plain gradient when the picture fails to load', () => {
    const { container } = render(<SceneArt scene="CORE"/>);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.scene-art-fallback')).not.toBeNull();
  });
});
