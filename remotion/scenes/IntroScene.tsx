import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { springScale, fadeIn } from "../utils/animations.js";
import { TypewriterText } from "../components/TypewriterText.js";
import { AnimatedText } from "../components/AnimatedText.js";

/**
 * IntroScene - Opening scene for SKU Generator demo video
 * Duration: ~4 seconds (120 frames at 30fps)
 *
 * Animation sequence:
 * - Frame 0-40: Logo spring scale from 0 to 1
 * - Frame 20-70: Title typewriter "SKU Generator"
 * - Frame 75-120: Tagline fade in with slide
 */
export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo spring scale animation (starts frame 0, damping 15 for subtle bounce)
  const logoScale = springScale(frame, {
    startFrame: 0,
    fps,
    damping: 15,
    stiffness: 100,
    mass: 1,
    from: 0,
    to: 1,
  });

  // Logo fade in (quick fade to complement spring)
  const logoOpacity = fadeIn(frame, { startFrame: 0, durationFrames: 15 });

  // Title starts after logo animation begins settling (~frame 20)
  const titleStartFrame = 20;
  // "SKU Generator" = 13 chars, 3 frames per char = 39 frames total
  const titleFramesPerChar = 3;
  const titleText = "SKU Generator";

  // Tagline fades in after title is mostly complete
  const taglineStartFrame = 75;
  const taglineText = "Auto-generate SKU codes with ease";

  return (
    <AbsoluteFill
      className="flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, hsl(222.2 84% 4.9%) 0%, hsl(217.2 32.6% 17.5%) 50%, hsl(222.2 84% 4.9%) 100%)",
      }}
    >
      {/* Logo container */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
        className="mb-8"
      >
        {/* App icon - a stylized spreadsheet/barcode hybrid */}
        <div className="w-32 h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
          <svg
            width="80"
            height="80"
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
            {/* SKU barcode-like elements in first column */}
            <rect
              x="14"
              y="28"
              width="3"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            <rect
              x="19"
              y="28"
              width="2"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            <rect
              x="23"
              y="28"
              width="4"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            <rect
              x="14"
              y="43"
              width="4"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            <rect
              x="20"
              y="43"
              width="2"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            <rect
              x="24"
              y="43"
              width="3"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            <rect
              x="14"
              y="58"
              width="2"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            <rect
              x="18"
              y="58"
              width="4"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            <rect
              x="24"
              y="58"
              width="3"
              height="9"
              fill="white"
              fillOpacity="0.9"
            />
            {/* Data cells placeholder dots */}
            <circle cx="45" cy="32" r="2" fill="white" fillOpacity="0.5" />
            <circle cx="58" cy="32" r="2" fill="white" fillOpacity="0.5" />
            <circle cx="45" cy="47" r="2" fill="white" fillOpacity="0.5" />
            <circle cx="58" cy="47" r="2" fill="white" fillOpacity="0.5" />
            <circle cx="45" cy="62" r="2" fill="white" fillOpacity="0.5" />
            <circle cx="58" cy="62" r="2" fill="white" fillOpacity="0.5" />
          </svg>
        </div>
      </div>

      {/* Title with typewriter effect */}
      <div className="text-6xl font-bold text-white mb-4">
        <TypewriterText
          text={titleText}
          startFrame={titleStartFrame}
          framesPerChar={titleFramesPerChar}
          showCursor={true}
          cursorChar="|"
          cursorBlinkFrames={15}
          cursorStayFrames={40}
          cursorClassName="text-white/70"
        />
      </div>

      {/* Tagline with fade-in and slide animation */}
      <AnimatedText
        startFrame={taglineStartFrame}
        fadeDuration={25}
        slideDuration={25}
        slideDirection="up"
        slideDistance={30}
        className="text-xl text-white/70 font-light tracking-wide"
      >
        {taglineText}
      </AnimatedText>
    </AbsoluteFill>
  );
};

export default IntroScene;
