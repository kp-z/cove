import backgroundSvg from '@/assets/background.svg';

export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* SVG Background - scaled to fit entire image */}
      <img
        src={backgroundSvg}
        alt="Background"
        className="absolute inset-0 w-full h-full object-contain"
      />
      {/* Uniform dark overlay for better card visibility */}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
