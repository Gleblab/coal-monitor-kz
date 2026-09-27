export function BookmarkIcon({ filled = false, className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
    >
      <path
        d="M4.25 2.5h7.5v11L8 11.25 4.25 13.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
