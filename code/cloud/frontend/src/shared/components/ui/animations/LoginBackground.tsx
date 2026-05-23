import backgroundSvg from '@/assets/background.svg';

export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Video Background with SVG fallback */}
      <video
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        poster={backgroundSvg}
      >
        <source src="/login-background.webm" type="video/webm" />
        {/* Fallback to SVG if video fails to load */}
        <img
          src={backgroundSvg}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </video>
      {/* Uniform dark overlay for better card visibility */}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
