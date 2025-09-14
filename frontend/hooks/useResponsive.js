import { useEffect } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

// Minimal responsive hook inspired by responsive-manager.js
export function useResponsive() {
  const { workSize, setWorkSize } = useAppState();

  useEffect(() => {
    const onResize = () => {
      // Example: keep a 16:9 work area that fits viewport width
      const w = Math.max(320, Math.min(window.innerWidth - 32, 1280));
      const h = Math.round((w / 16) * 9);
      setWorkSize(w, h);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setWorkSize]);

  return workSize;
}

