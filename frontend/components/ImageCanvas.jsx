import { useMemo } from 'react';
import Image from 'next/image';
import { useAppState } from '../context/AppStateContext.jsx';

// Minimal image canvas that mirrors image-manager.js transform state
export default function ImageCanvas() {
  const { imgState, workSize } = useAppState();

  const transform = useMemo(() => {
    const sx = (imgState.flip ? -1 : 1) * (imgState.signX ?? 1);
    const sy = imgState.signY ?? 1;
    return [
      'translate(-50%,-50%)',
      `rotate(${imgState.angle}rad)`,
      `skew(${imgState.shearX}rad, ${imgState.shearY}rad)`,
      `scale(${imgState.scale * sx}, ${imgState.scale * sy})`,
    ].join(' ');
  }, [imgState]);

  return (
    <div
      id="work"
      style={{
        position: 'relative',
        width: workSize.w,
        height: workSize.h,
        background: '#0b0b22',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* User background image wrapper */}
      <div
        id="userBgWrap"
        style={{
          position: 'absolute',
          left: imgState.cx,
          top: imgState.cy,
          width: imgState.natW,
          height: imgState.natH,
          transform,
          transformOrigin: '50% 50%',
        }}
      >
        {imgState.has ? (
          <Image
            id="userBg"
            src={imgState.backendImageUrl || imgState.backendThumbnailUrl || '/placeholder.jpg'}
            alt="Background"
            fill
            sizes="100vw"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12, padding: 8 }}>No image selected</div>
        )}
      </div>
    </div>
  );
}

