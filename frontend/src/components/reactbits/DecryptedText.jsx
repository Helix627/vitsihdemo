import { useEffect, useState, useRef } from "react";

const GLYPHS = "01#@$%&*+=~_?<>{}[]/\\|0101";

/**
 * ReactBits - DecryptedText
 * Simulates a cybernetic/terminal decryption effect for text strings.
 */
export default function DecryptedText({
  text = "",
  speed = 40,
  maxIterations = 10,
  sequential = true,
  animateOn = "mount", // 'mount' | 'hover'
  className = "",
  parentClassName = "",
  encryptedClassName = "text-cyan-400 font-mono",
  style = {},
  ...props
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    let interval;
    let iteration = 0;

    const startDecryption = () => {
      const originalText = text.toString();
      const length = originalText.length;

      interval = setInterval(() => {
        setDisplayText((prev) => {
          return originalText
            .split("")
            .map((char, index) => {
              if (char === " ") return " ";
              if (sequential) {
                if (index < iteration / 2) return originalText[index];
              } else {
                if (Math.random() < iteration / maxIterations) return originalText[index];
              }
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            })
            .join("");
        });

        iteration += 1;
        if (iteration > (sequential ? length * 2 : maxIterations)) {
          clearInterval(interval);
          setDisplayText(originalText);
        }
      }, speed);
    };

    if (animateOn === "mount" || (animateOn === "hover" && isHovering)) {
      startDecryption();
    } else {
      setDisplayText(text);
    }

    return () => clearInterval(interval);
  }, [text, speed, maxIterations, sequential, animateOn, isHovering]);

  return (
    <span
      className={`inline-block ${parentClassName}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={style}
      {...props}
    >
      <span className={className}>{displayText}</span>
    </span>
  );
}
