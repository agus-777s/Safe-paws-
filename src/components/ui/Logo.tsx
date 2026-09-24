export default function Logo({ ancho = 28, alto = 28 }: { ancho?: number; alto?: number }) {
  return (
    <svg
      width={ancho}
      height={alto}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Pata de perro: 4 dedos + almohadilla */}
      <ellipse cx="5.6" cy="9.8" rx="1.9" ry="2.4" transform="rotate(-18 5.6 9.8)" />
      <ellipse cx="9.7" cy="6.6" rx="1.9" ry="2.5" transform="rotate(-6 9.7 6.6)" />
      <ellipse cx="14.3" cy="6.6" rx="1.9" ry="2.5" transform="rotate(6 14.3 6.6)" />
      <ellipse cx="18.4" cy="9.8" rx="1.9" ry="2.4" transform="rotate(18 18.4 9.8)" />
      <path d="M12 11.6c2.9 0 5.2 1.9 5.6 4 .2 1.1-.7 1.9-1.7 1.9-1.3 0-2.4-.5-3.3-1.1-.4-.3-.8-.4-1.2-.4-.4 0-.8.1-1.2.4-.9.6-2 1.1-3.3 1.1-1 0-1.9-.8-1.7-1.9.4-2.1 2.7-4 5.6-4Z" />
    </svg>
  )
}
