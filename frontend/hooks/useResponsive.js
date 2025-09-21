import { useEffect, useRef } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

// Minimal responsive hook inspired by responsive-manager.js
export function useResponsive() {
  const { workSize, setWorkSize } = useAppState();
  const setWorkSizeRef = useRef(setWorkSize);

  useEffect(() => {
    setWorkSizeRef.current = setWorkSize;
  }, [setWorkSize]);

  useEffect(() => {
    const onResize = () => {
      if (typeof window === 'undefined') {
        return;
      }
      const w = Math.max(320, Math.min(window.innerWidth - 32, 1280));
      const h = Math.round((w / 16) * 9);
      const updater = setWorkSizeRef.current;
      if (typeof updater === 'function') {
        updater(w, h);
      }
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return workSize;
}

