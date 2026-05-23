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
      </video>
      {/* Gradient Overlay - redesigned for optimal card visibility */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(15, 17, 26, 0.05) 0%, rgba(15, 17, 26, 0.1) 40%, rgba(15, 17, 26, 0.4) 55%, rgba(15, 17, 26, 0.85) 70%, rgba(15, 17, 26, 1) 80%)',
        }}
      />
    </div>
  );
}
