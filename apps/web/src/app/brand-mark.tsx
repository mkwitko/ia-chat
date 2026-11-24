import { PRODUCT_NAME } from '@/copy';

// Placeholder mark until the logo is designed (docs/brand.md): a door left ajar.
const DEFAULT_SIZE = 32;

export function BrandMark({ size = DEFAULT_SIZE }: Readonly<{ size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={PRODUCT_NAME}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M10 25V8h12v17"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M10 8l7 3v16l-7-2z" className="fill-primary-foreground" />
    </svg>
  );
}
