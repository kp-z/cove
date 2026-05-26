import { motion } from 'framer-motion'

interface GlobalLoaderProps {
  message?: string
  progress?: number
  showProgress?: boolean
}

export function GlobalLoader({ message, progress, showProgress }: GlobalLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f111a]"
    >
      {/* SVG Loader (移植自 claude_manager) */}
      <div className="loader">
        <svg width={100} height={100} viewBox="0 0 100 100">
          <defs>
            <mask id="global-clipping">
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <polygon points="25,25 75,25 50,75" fill="white" />
              <polygon points="50,25 75,75 25,75" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
            </mask>
          </defs>
        </svg>
        <div className="box" />
      </div>

      {/* 可选文本 */}
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-400 animate-pulse mt-6"
        >
          {message}
        </motion.p>
      )}

      {/* Progress Bar */}
      {showProgress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 w-64"
        >
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {progress}%
          </p>
        </motion.div>
      )}

      <style>{`
        .loader {
          --color-one: #3b82f6;
          --color-two: #1e40af;
          --color-three: #3b82f680;
          --color-four: #1e40af80;
          --color-five: #3b82f640;
          --time-animation: 2s;
          --size: 1;
          position: relative;
          border-radius: 50%;
          transform: scale(var(--size));
          box-shadow:
            0 0 25px 0 var(--color-three),
            0 20px 50px 0 var(--color-four);
          animation: colorize calc(var(--time-animation) * 3) ease-in-out infinite;
        }

        .loader::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border-top: solid 1px var(--color-one);
          border-bottom: solid 1px var(--color-two);
          background: linear-gradient(180deg, var(--color-five), var(--color-four));
          box-shadow:
            inset 0 10px 10px 0 var(--color-three),
            inset 0 -10px 10px 0 var(--color-four);
        }

        .loader .box {
          width: 100px;
          height: 100px;
          background: linear-gradient(
            180deg,
            var(--color-one) 30%,
            var(--color-two) 70%
          );
          mask: url(#global-clipping);
          -webkit-mask: url(#global-clipping);
        }

        .loader svg {
          position: absolute;
        }

        .loader svg #global-clipping {
          filter: contrast(15);
          animation: roundness calc(var(--time-animation) / 2) linear infinite;
        }

        .loader svg #global-clipping polygon {
          filter: blur(7px);
        }

        .loader svg #global-clipping polygon:nth-child(1) {
          transform-origin: 75% 25%;
          transform: rotate(90deg);
        }

        .loader svg #global-clipping polygon:nth-child(2) {
          transform-origin: 50% 50%;
          animation: rotation var(--time-animation) linear infinite reverse;
        }

        .loader svg #global-clipping polygon:nth-child(3) {
          transform-origin: 50% 60%;
          animation: rotation var(--time-animation) linear infinite;
          animation-delay: calc(var(--time-animation) / -3);
        }

        .loader svg #global-clipping polygon:nth-child(4) {
          transform-origin: 40% 40%;
          animation: rotation var(--time-animation) linear infinite reverse;
        }

        .loader svg #global-clipping polygon:nth-child(5) {
          transform-origin: 40% 40%;
          animation: rotation var(--time-animation) linear infinite reverse;
          animation-delay: calc(var(--time-animation) / -2);
        }

        .loader svg #global-clipping polygon:nth-child(6) {
          transform-origin: 60% 40%;
          animation: rotation var(--time-animation) linear infinite;
        }

        .loader svg #global-clipping polygon:nth-child(7) {
          transform-origin: 60% 40%;
          animation: rotation var(--time-animation) linear infinite;
          animation-delay: calc(var(--time-animation) / -1.5);
        }

        @keyframes rotation {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes roundness {
          0% {
            filter: contrast(15);
          }
          20% {
            filter: contrast(3);
          }
          40% {
            filter: contrast(3);
          }
          60% {
            filter: contrast(15);
          }
          100% {
            filter: contrast(15);
          }
        }

        @keyframes colorize {
          0% {
            filter: hue-rotate(0deg);
          }
          20% {
            filter: hue-rotate(-30deg);
          }
          40% {
            filter: hue-rotate(-60deg);
          }
          60% {
            filter: hue-rotate(-90deg);
          }
          80% {
            filter: hue-rotate(-45deg);
          }
          100% {
            filter: hue-rotate(0deg);
          }
        }
      `}</style>
    </motion.div>
  )
}
