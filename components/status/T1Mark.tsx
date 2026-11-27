/** The Turn One mark: a slanted crimson parallelogram with a speed cut. Original artwork. */
export function T1Mark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 3h14l-6 18H2z" fill="var(--crimson)" />
      <path d="M12.2 3 6.4 21h2.6L14.8 3z" fill="var(--bg)" opacity="0.9" />
    </svg>
  );
}
