/**
 * utils/validateEmail.ts — Strict institutional email domain validation for SkillNova frontend.
 * Restricts accounts and authentication to @bitsathy.ac.in.
 */

export const ALLOWED_DOMAIN = 'bitsathy.ac.in';

/**
 * Strips whitespace and lowercases the email.
 */
export function normalizeEmail(rawEmail: string): string {
  return String(rawEmail || '').trim().toLowerCase();
}

/**
 * Checks if the email strictly matches @bitsathy.ac.in:
 * 1. Verifies basic email regex shape.
 * 2. Extracts domain from the LAST '@' occurrence.
 * 3. Compares exact equality with ALLOWED_DOMAIN.
 */
export function isAllowedInstituteEmail(rawEmail: string): boolean {
  const email = normalizeEmail(rawEmail);
  if (!email) return false;

  // Basic shape check (single @ in local context, valid characters and domain)
  const emailShapeRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailShapeRegex.test(email)) return false;

  // Exact domain match on the part AFTER the last "@"
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;

  const domain = email.slice(atIndex + 1);
  return domain === ALLOWED_DOMAIN;
}

/**
 * Checks if the email has a valid standard email format.
 */
export function isValidEmailFormat(rawEmail: string): boolean {
  const email = normalizeEmail(rawEmail);
  if (!email) return false;
  const emailShapeRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  return emailShapeRegex.test(email);
}
