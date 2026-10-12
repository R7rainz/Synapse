export function BrandMark({ className = "h-4 w-[18px]" }: { className?: string }) {
  return (
    <svg className={`${className} fill-current`} viewBox="0 0 36 32" aria-hidden="true">
      <path d="M0 5 5 0h3v13h5l4-4v8l-3 3H8v12H0Z" />
      <path d="M20 0h16v7H23l-3 3v12l3 3h13l-7 7h-9l-7-7V7Z" />
    </svg>
  );
}
