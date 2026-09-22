/**
 * ReactBits - ShinyText
 * Generates a continuous animated metallic/radiant light sweep effect across text.
 */
export default function ShinyText({
  text = "",
  disabled = false,
  speed = 3,
  className = "",
  style = {},
  children,
}) {
  const content = children || text;

  if (disabled) {
    return <span className={className} style={style}>{content}</span>;
  }

  return (
    <span
      className={`relative inline-block font-bold tracking-wide ${className}`}
      style={{
        backgroundImage: "linear-gradient(120deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 0.3) 100%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: `shiny-sweep ${speed}s linear infinite`,
        ...style,
      }}
    >
      {content}
    </span>
  );
}
