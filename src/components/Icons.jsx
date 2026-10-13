export function Arrow({ diagonal = false, className = "" }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {diagonal ? (
        <path d="M5 19 19 5M5 5h14v14" />
      ) : (
        <path d="M4 12h15m-6-6 6 6-6 6" />
      )}
    </svg>
  );
}

export function Mark({ className = "" }) {
  return (
    <svg
      className={className}
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 6h6v18h12v6H6V6Z" fill="currentColor" />
      <path d="M18 6h6v12h6v6H18V6Z" fill="currentColor" opacity=".55" />
    </svg>
  );
}

export function ExternalLink({ href, children, className = "" }) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <Arrow diagonal />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
