export const ADMIN_EMAILS = [
  "faustoplaystationfafatube@gmail.com",
  "hikef005@gmail.com",
] as const;

export function isAllowedAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase().trim() as (typeof ADMIN_EMAILS)[number]);
}