'use client';

import { useEffect, useState } from 'react';
import { getClientCookie, getClientRole } from '../auth';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_SESSION_CHANGED_EVENT,
  AppRole,
} from '../auth-shared';
import { usePathname } from 'next/navigation';

type AuthSession = {
  ready: boolean;
  accessToken?: string;
  role: AppRole | null;
};

export function useAuthSession(): AuthSession {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<AppRole | null>(null);

  const syncFromCookies = () => {
    setAccessToken(getClientCookie(AUTH_ACCESS_COOKIE) ?? undefined);
    setRole(getClientRole());
  };

  useEffect(() => {
    syncFromCookies();
    setReady(true);
  }, [pathname]);

  useEffect(() => {
    const handleSessionChanged = () => {
      syncFromCookies();
      setReady(true);
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
    };
  }, []);

  return { ready, accessToken, role };
}
