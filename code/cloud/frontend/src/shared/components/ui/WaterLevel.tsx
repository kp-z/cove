import { useEffect, useState } from 'react';

interface WaterLevelProps {
  percentage: number;
  size?: number;
}

export function WaterLevel({ percentage, size = 60 }: WaterLevelProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const remainingPercentage = 100 - animatedPercentage;
  const wavePosition = ((100 - remainingPercentage) / 100) * size;

  const getColor = () => {
    if (remainingPercentage >= 50) return 'rgba(34, 197, 94, 0.2)';
    if (remainingPercentage >= 10) return 'rgba(251, 191, 36, 0.6)';
    return 'rgba(239, 68, 68, 0.6)';
  };

  const color = getColor();
  const clipRadius = (size / 2) - 2;

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full transition-colors duration-1000 ease-out pointer-events-none"
        style={{ zIndex: 20 }}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <clipPath id={`bubble-clip-${size}`}>
            <circle cx={size / 2} cy={size / 2} r={clipRadius} />
          </clipPath>
        </defs>

        <rect
          x="0"
          y={wavePosition}
          width={size}
          height={size - wavePosition}
          fill={color}
          clipPath={`url(#bubble-clip-${size})`}
        />
      </svg>

      <svg
        className="absolute inset-0 w-full h-full transition-colors duration-1000 ease-out pointer-events-none"
        style={{ zIndex: 21 }}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <clipPath id={`bubble-clip-wave-${size}`}>
            <circle cx={size / 2} cy={size / 2} r={clipRadius} />
          </clipPath>
        </defs>

        <g clipPath={`url(#bubble-clip-wave-${size})`}>
          <path
            stroke={color}
            strokeWidth="2"
            fill="none"
            d={`M0,${wavePosition} Q${size * 0.25},${wavePosition - 2} ${size * 0.5},${wavePosition} T${size},${wavePosition}`}
          >
            <animate
              attributeName="d"
              dur="3s"
              repeatCount="indefinite"
              values={`
                M0,${wavePosition} Q${size * 0.25},${wavePosition - 2} ${size * 0.5},${wavePosition} T${size},${wavePosition};
                M0,${wavePosition} Q${size * 0.25},${wavePosition + 2} ${size * 0.5},${wavePosition} T${size},${wavePosition};
                M0,${wavePosition} Q${size * 0.25},${wavePosition - 2} ${size * 0.5},${wavePosition} T${size},${wavePosition}
              `}
            />
          </path>
        </g>
      </svg>
    </>
  );
}
