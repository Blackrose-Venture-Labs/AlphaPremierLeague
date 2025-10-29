import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Get the full path for a model icon
 * @param {string} iconFilename - The icon filename returned from the API (e.g., "gemini.png") or full path from mock data (e.g., "/ai_logo/gemini.png")
 * @returns {string} The full path to the icon (e.g., "/ai_logo/gemini.png")
 */
export function getModelIconPath(iconFilename) {
  if (!iconFilename) return null;
  // If it's already a full path, return as is
  if (iconFilename.startsWith('/ai_logo/')) return iconFilename;
  // Otherwise, prepend the path
  return `/ai_logo/${iconFilename}`;
}

/**
 * Get the first letter of a model's code name as fallback
 * @param {string} codeName - The model's code name
 * @returns {string} The first letter uppercase
 */
export function getModelIconFallback(codeName) {
  if (!codeName) return '?';
  return codeName.charAt(0).toUpperCase();
}
