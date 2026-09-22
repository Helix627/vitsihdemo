import { useRef, useState, useEffect } from "react";

/**
 * ReactBits - SpotlightCard
 * Creates an interactive card with a dynamic mouse-following radial spotlight glow.
 */
export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(0, 240, 255, 0.15)",
  borderColor = "rgba(56, 189, 248, 0.2)",
  style = {},
  onClick,
  ...props
}) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setOpacity(0.6);
  };

  const handleBlur = () => {
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${className}`}
      style={{
        borderColor: borderColor,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
        ...style,
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
