'use client';

import { useEffect, useState } from 'react';
import { getClientCookie } from '../../lib/auth';
import { AUTH_ACCESS_COOKIE, AUTH_SESSION_CHANGED_EVENT } from '../../lib/auth-shared';
import { usePathname } from 'next/navigation';

type UseAdminAccessTokenResult = {
  ready: boolean;
  accessToken?: string;
};

export function useAdminAccessToken(): UseAdminAccessTokenResult {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);

  const syncFromCookies = () => {
    const token = getClientCookie(AUTH_ACCESS_COOKIE) ?? undefined;
    setAccessToken(token);
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

  return { ready, accessToken };
}
