export default function WarningBadge({ level, message }) {
  if (!message) return null;
  return (
    <span className={`warning-badge ${level}`}>
      {message}
    </span>
  );
}
