import { useEffect, useRef, useState } from "react";

/**
 * ReactBits - CountUp
 * Smoothly animates numerical increments using requestAnimationFrame and easeOutExpo.
 */
export default function CountUp({
  to = 0,
  from = 0,
  duration = 1.2,
  separator = ",",
  className = "",
  decimals = 0,
  formatter,
  style = {},
}) {
  const [count, setCount] = useState(from);
  const startTimeRef = useRef(null);
  const targetNumber = typeof to === "number" ? to : parseFloat(to) || 0;

  useEffect(() => {
    let animationFrame;
    const startValue = count;
    const diff = targetNumber - startValue;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / (duration * 1000), 1);

      // Ease out exponential curve: 1 - 2^(-10 * progress)
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + diff * easeOut;

      setCount(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        startTimeRef.current = null;
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrame);
      startTimeRef.current = null;
    };
  }, [targetNumber, duration]);

  const formatNumber = (num) => {
    if (formatter) return formatter(num);
    const fixed = num.toFixed(decimals);
    if (!separator) return fixed;
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  };

  return (
    <span className={`font-mono font-bold ${className}`} style={style}>
      {formatNumber(count)}
    </span>
  );
}
