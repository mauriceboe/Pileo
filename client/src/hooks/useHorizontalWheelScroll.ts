import { useEffect, type RefObject } from 'react';

/**
 * Translates vertical wheel input into horizontal scroll on the target container.
 * Skips when the wheel event originates inside a scrollable child matching `passThroughSelector`,
 * so the inner element can scroll vertically as normal.
 */
export function useHorizontalWheelScroll(
  ref: RefObject<HTMLElement | null>,
  passThroughSelector: string,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || el.scrollWidth <= el.clientWidth) return;

      const target = e.target as HTMLElement | null;
      const passThrough = target?.closest(passThroughSelector) as HTMLElement | null;
      if (passThrough && passThrough.scrollHeight > passThrough.clientHeight) return;

      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 2, behavior: 'auto' });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, passThroughSelector, ...deps]);
}
