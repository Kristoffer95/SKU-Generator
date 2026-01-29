import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { springScale, fadeIn, slideIn, stagger } from "../utils/animations.js";

/**
 * OutroScene - Closing scene for SKU Generator demo video
 * Duration: ~2.5 seconds (75 frames at 30fps)
 *
 * Animation sequence:
 * - Frame 0-45: Feature bullet list slides in from right with staggered timing
 * - Frame 25-60: CTA text 'Try it now' animates with scale and glow effect
 * - Frame 40-75: App logo fades back in at corner position
 */

interface FeatureBulletProps {
  text: string;
  index: number;
  startFrame: number;
}

const FeatureBullet: React.FC<FeatureBulletProps> = ({ text, index, startFrame }) => {
  const frame = useCurrentFrame();
  const itemStartFrame = stagger({ index, staggerDelay: 6, startFrame });

  const opacity = fadeIn(frame, { startFrame: itemStartFrame, durationFrames: 12 });
  const { x } = slideIn(frame, {
    startFrame: itemStartFrame,
    durationFrames: 15,
    direction: "right",
    distance: 80,
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${x}px)`,
      }}
      className="flex items-center gap-3 text-lg text-white/90"
    >
      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
};

const features = [
  "Define specs with SKU code mappings",
  "Auto-generate SKUs from dropdowns",
  "Import & export Excel/CSV",
  "Multi-sheet support",
  "Real-time validation",
];

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // CTA animation (starts frame 25)
  const ctaStartFrame = 25;
  const ctaScale = springScale(frame, {
    startFrame: ctaStartFrame,
    fps,
    damping: 12,
    stiffness: 100,
    mass: 1,
    from: 0.5,
    to: 1,
  });
  const ctaOpacity = fadeIn(frame, { startFrame: ctaStartFrame, durationFrames: 15 });

  // Glow effect pulsing
  const glowIntensity = interpolate(
    frame,
    [ctaStartFrame, ctaStartFrame + 20, ctaStartFrame + 40, ctaStartFrame + 50],
    [0, 1, 0.6, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Logo animation (starts frame 40)
  const logoStartFrame = 40;
  const logoOpacity = fadeIn(frame, { startFrame: logoStartFrame, durationFrames: 20 });
  const logoScale = springScale(frame, {
    startFrame: logoStartFrame,
    fps,
    damping: 18,
    stiffness: 80,
    from: 0.8,
    to: 1,
  });

  return (
    <AbsoluteFill
      className="flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, hsl(222.2 84% 4.9%) 0%, hsl(217.2 32.6% 17.5%) 50%, hsl(222.2 84% 4.9%) 100%)",
      }}
    >
      {/* Main content container */}
      <div className="flex flex-col items-center gap-10 max-w-3xl">
        {/* Feature bullets */}
        <div className="flex flex-col gap-4">
          {features.map((feature, index) => (
            <FeatureBullet
              key={feature}
              text={feature}
              index={index}
              startFrame={0}
            />
          ))}
        </div>

        {/* CTA with glow effect */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
          }}
          className="relative mt-6"
        >
          {/* Glow background */}
          <div
            style={{
              opacity: glowIntensity * 0.6,
            }}
            className="absolute inset-0 blur-xl bg-blue-500 rounded-full scale-150"
          />
          {/* CTA text */}
          <div className="relative text-4xl font-bold text-white px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 shadow-2xl">
            Try it now
          </div>
        </div>
      </div>

      {/* Logo in corner */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
        className="absolute bottom-8 right-8"
      >
        <div className="flex items-center gap-3">
          {/* Mini logo icon */}
          <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Grid lines representing spreadsheet */}
              <rect
                x="10"
                y="10"
                width="60"
                height="60"
                rx="4"
                stroke="white"
                strokeWidth="2"
                strokeOpacity="0.8"
              />
              {/* Horizontal lines */}
              <line
                x1="10"
                y1="25"
                x2="70"
                y2="25"
                stroke="white"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
              <line
                x1="10"
                y1="40"
                x2="70"
                y2="40"
                stroke="white"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
              <line
                x1="10"
                y1="55"
                x2="70"
                y2="55"
                stroke="white"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
              {/* Vertical line for SKU column */}
              <line
                x1="30"
                y1="10"
                x2="30"
                y2="70"
                stroke="white"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
              {/* SKU barcode-like elements */}
              <rect x="14" y="28" width="3" height="9" fill="white" fillOpacity="0.9" />
              <rect x="19" y="28" width="2" height="9" fill="white" fillOpacity="0.9" />
              <rect x="23" y="28" width="4" height="9" fill="white" fillOpacity="0.9" />
              <rect x="14" y="43" width="4" height="9" fill="white" fillOpacity="0.9" />
              <rect x="20" y="43" width="2" height="9" fill="white" fillOpacity="0.9" />
              <rect x="24" y="43" width="3" height="9" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="text-white/80 font-semibold text-lg">SKU Generator</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default OutroScene;
