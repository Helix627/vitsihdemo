import { useRef, useEffect } from "react";

/**
 * ReactBits - SquaresBackground
 * Renders an interactive cybernetic square grid background on HTML5 Canvas.
 */
export default function SquaresBackground({
  direction = "right",
  speed = 0.5,
  borderColor = "rgba(56, 189, 248, 0.08)",
  squareSize = 40,
  hoverFillColor = "rgba(0, 240, 255, 0.08)",
  className = "",
}) {
  const canvasRef = useRef(null);
  const gridOffset = useRef({ x: 0, y: 0 });
  const hoveredSquare = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numCols = Math.ceil(canvas.width / squareSize) + 1;
      const numRows = Math.ceil(canvas.height / squareSize) + 1;

      // Draw squares
      for (let i = 0; i < numCols; i++) {
        for (let j = 0; j < numRows; j++) {
          const x = i * squareSize + (gridOffset.current.x % squareSize);
          const y = j * squareSize + (gridOffset.current.y % squareSize);

          if (
            hoveredSquare.current &&
            hoveredSquare.current.x === i &&
            hoveredSquare.current.y === j
          ) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(x, y, squareSize, squareSize);
          }

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, squareSize, squareSize);
        }
      }

      // Update grid movement offset
      if (direction === "right") gridOffset.current.x -= speed;
      if (direction === "left") gridOffset.current.x += speed;
      if (direction === "up") gridOffset.current.y += speed;
      if (direction === "down") gridOffset.current.y -= speed;

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const col = Math.floor((mouseX - (gridOffset.current.x % squareSize)) / squareSize);
      const row = Math.floor((mouseY - (gridOffset.current.y % squareSize)) / squareSize);

      hoveredSquare.current = { x: col, y: row };
    };

    const handleMouseLeave = () => {
      hoveredSquare.current = null;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [direction, speed, borderColor, hoverFillColor, squareSize]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-auto absolute inset-0 h-full w-full ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
