import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * decodeURIComponent, but malformed input (e.g. "%E0%A4%") returns null
 * instead of throwing URIError. Dynamic route params come straight from
 * the URL bar, so garbage must 404 gracefully, never 500.
 */
export function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
