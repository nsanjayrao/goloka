// A single-line lotus divider (DESIGN.md #6: "used max once per page").
// Plain geometric line art - deliberately not a realistic/deity depiction.
export function LotusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M32 30c0-10 4-16 10-20-2 8-2 14 0 20" />
      <path d="M32 30c0-10-4-16-10-20 2 8 2 14 0 20" />
      <path d="M32 30c0-13 3-21 8-26-1 10 0 18 3 26" />
      <path d="M32 30c0-13-3-21-8-26 1 10 0 18-3 26" />
      <path d="M32 30c0-8 0-15 0-22" />
      <path d="M14 30h36" />
    </svg>
  );
}
