export default function Logo({ ancho = 28, alto = 28 }: { ancho?: number; alto?: number }) {
  return (
    <svg
      width={ancho}
      height={alto}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="6.5" cy="9.5" r="1.8" />
      <circle cx="11" cy="7" r="1.9" />
      <circle cx="15.5" cy="9.5" r="1.8" />
      <circle cx="17.8" cy="13.5" r="1.6" />
      <circle cx="6.2" cy="13.5" r="1.6" />
      <path d="M12 12.8c3 0 5.4 2 5.8 4.2.2 1.1-.7 2-1.8 2-1.3 0-2.5-.5-3.4-1.1a2.4 2.4 0 0 0-1.2-.5c-.7-.1-1.4.1-2 .5-.9.7-2 1.1-3.3 1.1-1.1 0-2-.9-1.8-2 .4-2.2 2.8-4.2 5.7-4.2Z" />
    </svg>
  )
}