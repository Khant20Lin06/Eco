export type AppRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export const AUTH_ROLE_COOKIE = 'eco_role';
export const AUTH_ACCESS_COOKIE = 'eco_access_token';
export const AUTH_SESSION_CHANGED_EVENT = 'eco:auth-session-changed';

export function resolveRoleHome(locale: string, role: AppRole) {
  if (role === 'ADMIN') {
    return `/${locale}/admin`;
  }
  if (role === 'VENDOR') {
    return `/${locale}/vendor`;
  }
  return `/${locale}`;
}
