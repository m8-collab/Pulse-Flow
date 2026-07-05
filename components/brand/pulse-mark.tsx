export function PulseMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden="true">
        <path
          d="M0 10 H7 L9.5 3 L13 17 L16 10 L18 13 L20.5 10 H28"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pulse-trace"
        />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">PulseFlow</span>
    </div>
  );
}
