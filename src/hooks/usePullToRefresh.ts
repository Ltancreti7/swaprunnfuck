import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 80;
const MAX_PULL = 110;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const callbackRef = useRef(onRefresh);
  useEffect(() => { callbackRef.current = onRefresh; });

  const startY = useRef(0);
  const pullDist = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const indicatorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const setIndicator = (translateY: number, opacity: number, animated: boolean) => {
      const el = indicatorRef.current;
      if (!el) return;
      el.style.transition = animated ? 'transform 0.3s ease, opacity 0.3s ease' : 'none';
      el.style.transform = `translateY(${translateY}px)`;
      el.style.opacity = String(opacity);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0 && !refreshing.current) {
        startY.current = e.touches[0].clientY;
        pullDist.current = 0;
        pulling.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startY.current || refreshing.current) return;
      if (window.scrollY > 0) { startY.current = 0; return; }

      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) return;

      pulling.current = true;
      pullDist.current = Math.min(dy, MAX_PULL);
      const progress = Math.min(pullDist.current / THRESHOLD, 1);
      setIndicator(pullDist.current * 0.5 - 40, progress, false);
    };

    const onTouchEnd = async () => {
      if (!pulling.current) { startY.current = 0; return; }

      const dist = pullDist.current;
      pulling.current = false;
      pullDist.current = 0;
      startY.current = 0;

      if (dist >= THRESHOLD && !refreshing.current) {
        refreshing.current = true;
        setIsRefreshing(true);
        setIndicator(20, 1, true);
        try {
          await callbackRef.current();
        } finally {
          refreshing.current = false;
          setIsRefreshing(false);
          setIndicator(-60, 0, true);
        }
      } else {
        setIndicator(-60, 0, true);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return { isRefreshing, indicatorRef };
}
