import { useAppState } from '../context/AppStateContext.jsx';

export default function SlidesPanel({ slides = [] }) {
  const { selectedSlide, setSelectedSlide, slides: ctxSlides, setActiveIndex } = useAppState();
  const list = slides.length ? slides : ctxSlides;

  return (
    <div className="slides-panel">
      {list.map((slide, index) => (
        <button
          key={slide.id || index}
          className={selectedSlide === index ? 'active' : ''}
          onClick={() => { setSelectedSlide(index); setActiveIndex(index); }}
        >
          Slide {index + 1}
        </button>
      ))}
    </div>
  );
}
