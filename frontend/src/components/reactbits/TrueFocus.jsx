import { useState } from "react";

/**
 * ReactBits - TrueFocus
 * Creates animated glowing cyber brackets that snap to the active item or focused element.
 */
export default function TrueFocus({
  children,
  className = "",
  borderColor = "#00f0ff",
  glowColor = "rgba(0, 240, 255, 0.4)",
  glowRadius = 8,
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative inline-block transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Left Bracket */}
      <span
        className="pointer-events-none absolute -top-1 -left-1 h-2.5 w-2.5 border-t-2 border-l-2 transition-all duration-300"
        style={{
          borderColor: isHovered ? borderColor : "rgba(100, 116, 139, 0.4)",
          boxShadow: isHovered ? `0 0 ${glowRadius}px ${glowColor}` : "none",
          transform: isHovered ? "translate(-2px, -2px)" : "translate(0, 0)",
        }}
      />
      {/* Top Right Bracket */}
      <span
        className="pointer-events-none absolute -top-1 -right-1 h-2.5 w-2.5 border-t-2 border-r-2 transition-all duration-300"
        style={{
          borderColor: isHovered ? borderColor : "rgba(100, 116, 139, 0.4)",
          boxShadow: isHovered ? `0 0 ${glowRadius}px ${glowColor}` : "none",
          transform: isHovered ? "translate(2px, -2px)" : "translate(0, 0)",
        }}
      />
      {/* Bottom Left Bracket */}
      <span
        className="pointer-events-none absolute -bottom-1 -left-1 h-2.5 w-2.5 border-b-2 border-l-2 transition-all duration-300"
        style={{
          borderColor: isHovered ? borderColor : "rgba(100, 116, 139, 0.4)",
          boxShadow: isHovered ? `0 0 ${glowRadius}px ${glowColor}` : "none",
          transform: isHovered ? "translate(-2px, 2px)" : "translate(0, 0)",
        }}
      />
      {/* Bottom Right Bracket */}
      <span
        className="pointer-events-none absolute -bottom-1 -right-1 h-2.5 w-2.5 border-b-2 border-r-2 transition-all duration-300"
        style={{
          borderColor: isHovered ? borderColor : "rgba(100, 116, 139, 0.4)",
          boxShadow: isHovered ? `0 0 ${glowRadius}px ${glowColor}` : "none",
          transform: isHovered ? "translate(2px, 2px)" : "translate(0, 0)",
        }}
      />
      {children}
    </div>
  );
}
