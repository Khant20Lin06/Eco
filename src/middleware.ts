import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, AUTH_ROLE_COOKIE, AppRole, resolveRoleHome } from './lib/auth-shared';

const locales = ['en', 'my'] as const;
const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale: 'en'
});

function parseRole(raw: string | undefined): AppRole | null {
  if (raw === 'CUSTOMER' || raw === 'VENDOR' || raw === 'ADMIN') {
    return raw;
  }
  return null;
}

function pickLocale(pathname: string) {
  const first = pathname.split('/').filter(Boolean)[0];
  if (first === 'en' || first === 'my') {
    return first;
  }
  return null;
}

function roleRedirect(request: NextRequest, role: AppRole, locale: 'en' | 'my') {
  const pathname = request.nextUrl.pathname;
  const base = `/${locale}`;
  const isLogin = pathname === `${base}/login`;
  const isRegister = pathname === `${base}/register`;
  const isAuthPage = isLogin || isRegister;
  const isAdminPath = pathname === `${base}/admin` || pathname.startsWith(`${base}/admin/`);
  const isVendorPath = pathname === `${base}/vendor` || pathname.startsWith(`${base}/vendor/`);

  if (role === 'ADMIN') {
    if (!isAdminPath && !isAuthPage) {
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    }
  }

  if (role === 'VENDOR') {
    if (isAdminPath) {
      return NextResponse.redirect(new URL(`/${locale}/vendor`, request.url));
    }
  }

  if (role === 'CUSTOMER') {
    if (isAdminPath || isVendorPath) {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  if (isAuthPage) {
    return NextResponse.redirect(new URL(resolveRoleHome(locale, role), request.url));
  }

  return null;
}

function unauthRedirect(request: NextRequest, locale: 'en' | 'my') {
  const pathname = request.nextUrl.pathname;
  const base = `/${locale}`;
  const protectedPathPrefixes = [
    `${base}/orders`,
    `${base}/checkout`,
    `${base}/vendor`,
    `${base}/admin`,
    `${base}/notifications`,
    `${base}/chat`,
    `${base}/wishlist`,
  ];
  const isProtectedPrefix = protectedPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isProtected = isProtectedPrefix || pathname === `${base}/cart`;
  if (!isProtected) {
    return null;
  }

  return NextResponse.redirect(new URL(`${base}/login`, request.url));
}

export default function middleware(request: NextRequest) {
  const locale = pickLocale(request.nextUrl.pathname);
  if (locale) {
    const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value?.trim();
    const hasAccessToken = Boolean(accessToken);
    const role = parseRole(request.cookies.get(AUTH_ROLE_COOKIE)?.value);
    if (hasAccessToken && role) {
      const redirect = roleRedirect(request, role, locale);
      if (redirect) {
        return redirect;
      }
    } else {
      const redirect = unauthRedirect(request, locale);
      if (redirect) {
        return redirect;
      }
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
