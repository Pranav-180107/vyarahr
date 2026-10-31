export const PRIMARY_ADMIN_EMAILS = [
  'praveen12rangasamy@gmail.com',
  'pranavanandan18@gmail.com',
  'pranavananthan18@gmail.com',
  'jin@gmail.com'
];

/**
 * Checks if a given email is a primary administrator.
 */
export const isPrimaryAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return PRIMARY_ADMIN_EMAILS.includes(email.trim().toLowerCase());
};
