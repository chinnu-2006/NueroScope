import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge tailwind classes safely — later classes win, conditionals allowed. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
