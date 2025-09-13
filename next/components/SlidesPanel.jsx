import { useAppState } from '../context/AppStateContext.jsx';

export default function SlidesPanel({ slides = [] }) {
  const { selectedSlide, setSelectedSlide } = useAppState();

  return (
    <div className="slides-panel">
      {slides.map((slide, index) => (
        <button
          key={slide.id || index}
          className={selectedSlide === index ? 'active' : ''}
          onClick={() => setSelectedSlide(index)}
        >
          Slide {index + 1}
        </button>
      ))}
    </div>
  );
}
