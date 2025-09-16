import React, { useMemo } from 'react';
import Image from 'next/image';

export default function ImageLayer({ element }) {
  const wrapperStyle = useMemo(
    () => ({
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      transform: `rotate(${element.rotation || 0}deg)`,
    }),
    [element]
  );

  return (
    <div style={wrapperStyle} data-element-id={element.id}>
      <Image
        src={element.src || '/placeholder.jpg'}
        alt=""
        fill
        sizes="100vw"
        style={{ objectFit: element.fit || 'cover', pointerEvents: 'auto' }}
      />
    </div>
  );
}

