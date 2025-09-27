import { useEffect, useState } from 'react';

export default function TransitionLoader({
  isVisible,
  title = 'Loading...',
  subtitle = '',
  progress = 0,
  showProgress = false,
  onComplete,
}) {
  const [animationStage, setAnimationStage] = useState('entering');

  useEffect(() => {
    if (!isVisible) return;

    const stages = [
      { stage: 'entering', duration: 300 },
      { stage: 'loading', duration: 1000 },
      { stage: 'completing', duration: 500 },
    ];

    let timeoutId;
    let currentStage = 0;

    const nextStage = () => {
      if (currentStage < stages.length - 1) {
        currentStage++;
        setAnimationStage(stages[currentStage].stage);
        timeoutId = setTimeout(nextStage, stages[currentStage].duration);
      } else if (onComplete) {
        onComplete();
      }
    };

    setAnimationStage(stages[0].stage);
    timeoutId = setTimeout(nextStage, stages[0].duration);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`transition-loader ${animationStage}`}>
      <div className="transition-loader-content">
        {/* Animated logo/icon */}
        <div className="loader-icon">
          <div className="loader-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <div className="loader-symbol">🎨</div>
        </div>

        {/* Loading text */}
        <div className="loader-text">
          <h3 className="loader-title">{title}</h3>
          {subtitle && <p className="loader-subtitle">{subtitle}</p>}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="loader-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}

        {/* Loading tips */}
        <div className="loader-tips">
          {animationStage === 'entering' && (
            <p>Preparing your workspace...</p>
          )}
          {animationStage === 'loading' && (
            <p>Setting up design tools...</p>
          )}
          {animationStage === 'completing' && (
            <p>Almost ready!</p>
          )}
        </div>
      </div>
    </div>
  );
}