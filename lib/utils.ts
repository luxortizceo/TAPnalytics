import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Non-sequential, unguessable-enough short code for the physical NFC card URL. */
export function generatePublicCode() {
  return nanoid(10).replace(/[_-]/g, "x").toUpperCase();
}
