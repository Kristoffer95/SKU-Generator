import React from "react";
import { useCurrentFrame } from "remotion";
import { typewriter, fadeIn } from "../utils/animations.js";

export interface TypewriterTextProps {
  /** Text content to reveal character by character */
  text: string;
  /** Frame when typing starts (default: 0) */
  startFrame?: number;
  /** Frames per character (default: 2) */
  framesPerChar?: number;
  /** Whether to show blinking cursor (default: true) */
  showCursor?: boolean;
  /** Cursor character (default: "|") */
  cursorChar?: string;
  /** Cursor blink interval in frames (default: 15) */
  cursorBlinkFrames?: number;
  /** Whether cursor stays visible after typing (default: true for 30 frames) */
  cursorStayFrames?: number;
  /** Additional CSS class names for wrapper */
  className?: string;
  /** Additional CSS class names for cursor */
  cursorClassName?: string;
  /** Inline styles for wrapper */
  style?: React.CSSProperties;
}

/**
 * Typewriter text component that reveals text character by character.
 * Uses useCurrentFrame() for animations, not CSS transitions.
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame = 0,
  framesPerChar = 2,
  showCursor = true,
  cursorChar = "|",
  cursorBlinkFrames = 15,
  cursorStayFrames = 30,
  className = "",
  cursorClassName = "",
  style = {},
}) => {
  const frame = useCurrentFrame();

  // Calculate number of visible characters
  const visibleChars = typewriter(frame, text.length, {
    startFrame,
    framesPerChar,
  });

  // Get visible portion of text
  const visibleText = text.slice(0, visibleChars);

  // Calculate typing complete frame
  const typingCompleteFrame = startFrame + text.length * framesPerChar;
  const isTypingComplete = frame >= typingCompleteFrame;

  // Cursor visibility logic
  const shouldShowCursor = showCursor && frame >= startFrame;
  const cursorHideFrame = typingCompleteFrame + cursorStayFrames;
  const cursorVisible =
    shouldShowCursor &&
    (frame < cursorHideFrame || !isTypingComplete);

  // Cursor blinking (only after typing complete)
  const cursorBlink =
    isTypingComplete && cursorVisible
      ? Math.floor((frame - typingCompleteFrame) / cursorBlinkFrames) % 2 === 0
      : true;

  return (
    <span className={className} style={style}>
      {visibleText}
      {cursorVisible && (
        <span
          className={cursorClassName}
          style={{
            opacity: cursorBlink ? 1 : 0,
          }}
        >
          {cursorChar}
        </span>
      )}
    </span>
  );
};

export interface TypewriterLinesProps {
  /** Array of text lines to reveal sequentially */
  lines: string[];
  /** Frame when first line starts (default: 0) */
  startFrame?: number;
  /** Frames per character (default: 2) */
  framesPerChar?: number;
  /** Delay between lines in frames (default: 10) */
  lineDelay?: number;
  /** Whether to show cursor on current line (default: true) */
  showCursor?: boolean;
  /** Additional CSS class names for wrapper */
  className?: string;
  /** Additional CSS class names for each line */
  lineClassName?: string;
  /** Inline styles for wrapper */
  style?: React.CSSProperties;
}

/**
 * Multi-line typewriter component that reveals lines sequentially.
 */
export const TypewriterLines: React.FC<TypewriterLinesProps> = ({
  lines,
  startFrame = 0,
  framesPerChar = 2,
  lineDelay = 10,
  showCursor = true,
  className = "",
  lineClassName = "",
  style = {},
}) => {
  const frame = useCurrentFrame();

  // Calculate start frames for each line
  const lineStartFrames: number[] = [];
  let currentStart = startFrame;

  for (let i = 0; i < lines.length; i++) {
    lineStartFrames.push(currentStart);
    currentStart += lines[i].length * framesPerChar + lineDelay;
  }

  // Find current line being typed
  const currentLineIndex = lineStartFrames.findIndex((lineStart, i) => {
    const lineEndFrame = lineStart + lines[i].length * framesPerChar;
    return frame < lineEndFrame;
  });

  const activeLineIndex =
    currentLineIndex === -1 ? lines.length - 1 : currentLineIndex;

  return (
    <div className={className} style={style}>
      {lines.map((line, index) => {
        const lineStart = lineStartFrames[index];
        const isVisible = frame >= lineStart;
        const isActiveLine = index === activeLineIndex;

        if (!isVisible) return null;

        return (
          <div
            key={index}
            className={lineClassName}
            style={{
              opacity: fadeIn(frame, {
                startFrame: lineStart,
                durationFrames: 5,
              }),
            }}
          >
            <TypewriterText
              text={line}
              startFrame={lineStart}
              framesPerChar={framesPerChar}
              showCursor={showCursor && isActiveLine}
              cursorStayFrames={index === lines.length - 1 ? 30 : 0}
            />
          </div>
        );
      })}
    </div>
  );
};

export default TypewriterText;
