import { useState } from 'react';
import { LoginHeroThree } from './LoginHeroThree';
import backgroundSvg from '@/assets/background.svg';

type BackgroundType = 'three' | 'svg';

interface LoginBackgroundProps {
  type?: BackgroundType;
  onTypeChange?: (type: BackgroundType) => void;
}

export function LoginBackground({ type = 'three', onTypeChange }: LoginBackgroundProps) {
  const [currentType, setCurrentType] = useState<BackgroundType>(type);

  const handleToggle = () => {
    const newType = currentType === 'three' ? 'svg' : 'three';
    setCurrentType(newType);
    onTypeChange?.(newType);
  };

  return (
    <>
      {/* Background Layer */}
      <div className="pointer-events-none absolute inset-0">
        {currentType === 'three' ? (
          <LoginHeroThree />
        ) : (
          <div className="absolute inset-0">
            {/* SVG Background */}
            <img
              src={backgroundSvg}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient Overlay - redesigned for optimal card visibility */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(15, 17, 26, 0.05) 0%, rgba(15, 17, 26, 0.1) 40%, rgba(15, 17, 26, 0.4) 55%, rgba(15, 17, 26, 0.85) 70%, rgba(15, 17, 26, 1) 80%)',
              }}
            />
          </div>
        )}
      </div>

      {/* Background Toggle Button */}
      <button
        onClick={handleToggle}
        className="pointer-events-auto fixed bottom-6 left-6 z-20 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white hover:bg-white/15 transition-all duration-200 text-sm"
      >
        {currentType === 'three' ? '切换到 SVG 背景' : '切换到 3D 背景'}
      </button>
    </>
  );
}
