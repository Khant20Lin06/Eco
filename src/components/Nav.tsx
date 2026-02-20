import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { AUTH_ROLE_COOKIE, AppRole } from '../lib/auth-shared';
import { CURRENCY_PREFERENCE_COOKIE, normalizeCurrencyCode } from '../lib/preferences';
import LogoutButton from './LogoutButton';
import NavActionIcons from './NavActionIcons';
import MobileNavDrawer from './nav/MobileNavDrawer';
import TopBarPreferences from './TopBarPreferences';

function IconSearch() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function parseRole(raw: string | undefined): AppRole | null {
  if (raw === 'CUSTOMER' || raw === 'VENDOR' || raw === 'ADMIN') {
    return raw;
  }
  return null;
}

function getAccountHref(locale: string, role: AppRole | null) {
  if (role === 'ADMIN') return `/${locale}/admin`;
  if (role === 'VENDOR') return `/${locale}/vendor`;
  if (role === 'CUSTOMER') return `/${locale}/orders`;
  return `/${locale}/login`;
}

export default async function Nav({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const role = parseRole(cookies().get(AUTH_ROLE_COOKIE)?.value);
  const preferredCurrency = normalizeCurrencyCode(
    cookies().get(CURRENCY_PREFERENCE_COOKIE)?.value
  );
  if (role === 'ADMIN') {
    return null;
  }

  const loginHref = `/${locale}/login`;
  const registerHref = `/${locale}/register`;
  const withLoginReturnTo = (targetPath: string) =>
    `${loginHref}?returnTo=${encodeURIComponent(targetPath)}`;
  const protectedHref = (targetPath: string) =>
    role ? targetPath : withLoginReturnTo(targetPath);

  const accountHref = getAccountHref(locale, role);
  const chatHref = protectedHref(`/${locale}/chat`);
  const notificationsHref = protectedHref(`/${locale}/notifications`);
  const wishlistHref = protectedHref(`/${locale}/wishlist`);
  const bagHref = protectedHref(`/${locale}/cart`);
  const productsHref = protectedHref(`/${locale}/products`);

  const navMenu = [
    { href: `/${locale}`, label: t('home') },
    { href: productsHref, label: t('products') }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#d8d8d8] bg-white text-[#111] shadow-[0_8px_18px_rgba(12,16,32,0.08)]">
      <div className="bg-[#050505] text-[11px] text-white">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-2">
          <div className="hidden items-center gap-2 text-white/95 md:flex">
            <span className="text-xs">Tel</span>
            <span>Need Help? Call us at +566 4444 9940</span>
          </div>
          <p className="mx-auto text-center text-[11px] font-semibold tracking-[0.02em] md:mx-0">
            GET FLAT 20% OFF ON 1ST ORDER USE CODE FLAT20
          </p>
          <div className="hidden items-center gap-3 text-white/95 md:flex">
            <TopBarPreferences currency={preferredCurrency} locale={locale} />
            {role ? (
              <LogoutButton
                className="text-[11px] font-semibold text-white/90 hover:text-white"
                label={t('logout')}
                locale={locale}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-4 lg:hidden">
        <Link
          className="pr-2 text-[32px] font-semibold leading-none tracking-tight text-black"
          href={`/${locale}`}
        >
          Eco
        </Link>
        <MobileNavDrawer
          accountHref={accountHref}
          accountTitle={role ? 'Account' : t('login')}
          bagHref={bagHref}
          chatHref={chatHref}
          isAuthed={Boolean(role)}
          locale={locale}
          loginHref={loginHref}
          loginLabel={t('login')}
          logoutLabel={t('logout')}
          navLinks={navMenu}
          notificationsHref={notificationsHref}
          preferredCurrency={preferredCurrency}
          registerHref={registerHref}
          registerLabel={t('register')}
          wishlistHref={wishlistHref}
        />
      </div>

      <div className="mx-auto hidden w-full max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 lg:grid">
        <Link
          className="pr-2 text-[32px] font-semibold leading-none tracking-tight text-black"
          href={`/${locale}`}
        >
          Eco
        </Link>

        <nav className="flex items-center gap-8">
          {navMenu.map((item) => (
            <Link
              key={item.label}
              className="text-[18px] font-medium text-[#131313] hover:text-[#3150ad]"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <form
            action={`/${locale}/products`}
            className="relative hidden w-[310px] xl:block"
            method="GET"
          >
            <input
              className="h-10 w-full border border-[#d9d9d9] bg-[#f7f7f7] px-4 pr-10 text-[15px] font-medium text-[#222] outline-none placeholder:text-[#4d4d4d] focus:border-[#7b90d8]"
              name="q"
              placeholder="Search Products"
              type="text"
            />
            <button
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#1c1c1c]"
              type="submit"
            >
              <IconSearch />
            </button>
          </form>

          <NavActionIcons
            accountHref={accountHref}
            accountTitle={role ? 'Account' : t('login')}
            bagHref={bagHref}
            chatHref={chatHref}
            notificationsHref={notificationsHref}
            wishlistHref={wishlistHref}
          />
        </div>
      </div>
    </header>
  );
}
