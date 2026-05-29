import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderMentions } from './render-mentions';

describe('renderMentions', () => {
  it('returns plain text unchanged when no mentions present', () => {
    const { container } = render(<>{renderMentions('hello world', 'mention')}</>);
    expect(container.textContent).toBe('hello world');
    expect(container.querySelectorAll('span').length).toBe(0);
  });

  it('wraps @handles in a styled span', () => {
    const { container } = render(<>{renderMentions('hi @alice and @bob', 'mention')}</>);
    const spans = container.querySelectorAll('span.mention');
    expect(spans.length).toBe(2);
    expect(spans[0]?.textContent).toBe('@alice');
    expect(spans[1]?.textContent).toBe('@bob');
  });

  it('preserves text around the mentions', () => {
    const { container } = render(<>{renderMentions('hi @alice and @bob', 'mention')}</>);
    expect(container.textContent).toBe('hi @alice and @bob');
  });

  it('does not match an isolated @', () => {
    const { container } = render(<>{renderMentions('email me @ work', 'mention')}</>);
    expect(container.querySelectorAll('span.mention').length).toBe(0);
  });
});
