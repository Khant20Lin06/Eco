import {
  AUTH_ACCESS_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_CHANGED_EVENT,
  AppRole,
} from './auth-shared';

const ONE_DAY_SECONDS = 24 * 60 * 60;
const ACCESS_COOKIE_TTL_SECONDS = ONE_DAY_SECONDS;
const ROLE_COOKIE_TTL_SECONDS = 30 * ONE_DAY_SECONDS;

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function notifyAuthSessionChanged() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function clearClientAuthSession() {
  writeCookie(AUTH_ROLE_COOKIE, '', 0);
  writeCookie(AUTH_ACCESS_COOKIE, '', 0);
  notifyAuthSessionChanged();
}

export function setClientAuthSession(input: { role: AppRole; accessToken: string }) {
  writeCookie(AUTH_ROLE_COOKIE, input.role, ROLE_COOKIE_TTL_SECONDS);
  writeCookie(AUTH_ACCESS_COOKIE, input.accessToken, ACCESS_COOKIE_TTL_SECONDS);
  notifyAuthSessionChanged();
}

export function getClientCookie(name: string) {
  const parts = document.cookie.split(';');
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part.startsWith(`${name}=`)) {
      continue;
    }
    return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

export function getClientRole(): AppRole | null {
  const raw = getClientCookie(AUTH_ROLE_COOKIE);
  if (raw === 'CUSTOMER' || raw === 'VENDOR' || raw === 'ADMIN') {
    return raw;
  }
  return null;
}
