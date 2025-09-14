import React, { useMemo } from 'react';

export default function ImageLayer({ element }) {
  const style = useMemo(() => ({
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation || 0}deg)`,
    objectFit: element.fit || 'cover',
    pointerEvents: 'auto',
  }), [element]);

  return (
    <img src={element.src || ''} alt="" style={style} data-element-id={element.id} />
  );
}

