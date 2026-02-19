'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type RouteChromeProps = {
  mode: 'header' | 'footer';
  children: ReactNode;
};

function isAuthPage(pathname: string) {
  return /^\/(en|my)\/(login|register)\/?$/.test(pathname);
}

function isFooterPage(pathname: string) {
  return (
    /^\/(en|my)\/?$/.test(pathname) ||
    /^\/(en|my)\/products(?:\/.*)?$/.test(pathname) ||
    /^\/(en|my)\/product(?:\/.*)?$/.test(pathname)
  );
}

export default function RouteChrome({ mode, children }: RouteChromeProps) {
  const pathname = usePathname();

  if (mode === 'header' && isAuthPage(pathname)) {
    return null;
  }

  if (mode === 'footer' && !isFooterPage(pathname)) {
    return null;
  }

  return <>{children}</>;
}

