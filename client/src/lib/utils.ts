import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a tag for display - converts kebab-case to lowercase with spaces
 * e.g., "state-management" -> "state management"
 */
export function formatTag(tag: string): string {
  return tag.toLowerCase().replace(/-/g, ' ')
}
