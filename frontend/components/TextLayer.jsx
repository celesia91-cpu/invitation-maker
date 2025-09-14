import { useState } from 'react';

export default function TextLayer({ initialText = '' }) {
  const [text, setText] = useState(initialText);
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className="text-layer"
      contentEditable={isEditing}
      suppressContentEditableWarning
      onClick={() => setIsEditing(true)}
      onBlur={handleBlur}
      onInput={(e) => setText(e.currentTarget.textContent)}
    >
      {text}
    </div>
  );
}
