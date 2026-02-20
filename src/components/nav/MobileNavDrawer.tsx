'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppCurrency } from '../../lib/preferences';
import LogoutButton from '../LogoutButton';
import TopBarPreferences from '../TopBarPreferences';

type MobileNavLink = {
  href: string;
  label: string;
};

type MobileNavDrawerProps = {
  locale: string;
  navLinks: MobileNavLink[];
  preferredCurrency: AppCurrency;
  isAuthed: boolean;
  accountHref: string;
  accountTitle: string;
  chatHref: string;
  notificationsHref: string;
  wishlistHref: string;
  bagHref: string;
  loginHref: string;
  registerHref: string;
  loginLabel: string;
  registerLabel: string;
  logoutLabel: string;
};

function BurgerIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path
          d="M6 6l12 12M18 6 6 18"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

export default function MobileNavDrawer({
  locale,
  navLinks,
  preferredCurrency,
  isAuthed,
  accountHref,
  accountTitle,
  chatHref,
  notificationsHref,
  wishlistHref,
  bagHref,
  loginHref,
  registerHref,
  loginLabel,
  registerLabel,
  logoutLabel
}: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const drawerId = useMemo(() => `mobile-nav-drawer-${locale}`, [locale]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchText.trim();
    const targetPath = query
      ? `/${locale}/products?q=${encodeURIComponent(query)}`
      : `/${locale}/products`;
    const target = isAuthed
      ? targetPath
      : `/${locale}/login?returnTo=${encodeURIComponent(targetPath)}`;

    setOpen(false);
    router.push(target);
  }

  return (
    <>
      <button
        aria-controls={drawerId}
        aria-expanded={open}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d9d9] text-[#1b1b1b] transition hover:bg-[#f5f7ff]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <BurgerIcon open={open} />
      </button>

      {open ? (
        <button
          aria-label="Close navigation menu backdrop"
          className="fixed inset-0 z-40 bg-[#121932]/45 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 h-full w-[84vw] max-w-[360px] border-l border-[#d8e0ff] bg-white shadow-[0_24px_54px_rgba(14,26,66,0.24)] transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        id={drawerId}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#e1e8ff] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#1b2250]">Menu</h2>
            <button
              aria-label="Close navigation menu"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#1f2d63] hover:bg-[#eef2ff]"
              onClick={() => setOpen(false)}
              type="button"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.9"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <form className="relative" onSubmit={onSearchSubmit}>
              <input
                className="h-10 w-full rounded-lg border border-[#d8dff8] bg-[#f7f8ff] px-3 pr-10 text-sm text-[#21284f] outline-none focus:border-[#9ab0ff]"
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search Products"
                type="text"
                value={searchText}
              />
              <button
                aria-label="Search products"
                className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#36457f] hover:bg-white"
                type="submit"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path
                    d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </form>

            <nav className="space-y-2">
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  className="block rounded-lg border border-[#e1e7ff] bg-white px-3 py-2.5 text-sm font-semibold text-[#1f2c66] hover:border-[#adc0ff] hover:bg-[#f5f8ff]"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {!isAuthed ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  className="rounded-lg border border-[#c8d5ff] bg-white px-3 py-2 text-center text-sm font-semibold text-[#23408c]"
                  href={loginHref}
                  onClick={() => setOpen(false)}
                >
                  {loginLabel}
                </Link>
                <Link
                  className="rounded-lg bg-[#3050be] px-3 py-2 text-center text-sm font-semibold text-white"
                  href={registerHref}
                  onClick={() => setOpen(false)}
                >
                  {registerLabel}
                </Link>
              </div>
            ) : null}

            <div className="rounded-xl border border-[#e1e8ff] bg-[#f9fbff] p-3">
              <TopBarPreferences currency={preferredCurrency} locale={locale} tone="light" />
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#e1e8ff] bg-white p-3">
              <Link
                className="rounded-lg border border-[#e2e8ff] px-3 py-2 text-sm font-semibold text-[#23306b] hover:border-[#b8c8ff] hover:bg-[#f5f8ff]"
                href={accountHref}
                onClick={() => setOpen(false)}
              >
                {accountTitle}
              </Link>
              <Link
                className="rounded-lg border border-[#e2e8ff] px-3 py-2 text-sm font-semibold text-[#23306b] hover:border-[#b8c8ff] hover:bg-[#f5f8ff]"
                href={notificationsHref}
                onClick={() => setOpen(false)}
              >
                Notifications
              </Link>
              <Link
                className="rounded-lg border border-[#e2e8ff] px-3 py-2 text-sm font-semibold text-[#23306b] hover:border-[#b8c8ff] hover:bg-[#f5f8ff]"
                href={chatHref}
                onClick={() => setOpen(false)}
              >
                Chat
              </Link>
              <Link
                className="rounded-lg border border-[#e2e8ff] px-3 py-2 text-sm font-semibold text-[#23306b] hover:border-[#b8c8ff] hover:bg-[#f5f8ff]"
                href={wishlistHref}
                onClick={() => setOpen(false)}
              >
                Wishlist
              </Link>
              <Link
                className="col-span-2 rounded-lg border border-[#e2e8ff] px-3 py-2 text-sm font-semibold text-[#23306b] hover:border-[#b8c8ff] hover:bg-[#f5f8ff]"
                href={bagHref}
                onClick={() => setOpen(false)}
              >
                Cart
              </Link>
            </div>
          </div>

          {isAuthed ? (
            <div className="border-t border-[#e1e8ff] px-5 py-4">
              <LogoutButton
                className="inline-flex w-full items-center justify-center rounded-lg border border-[#e7b9c1] bg-[#fff5f7] px-3 py-2 text-sm font-semibold text-[#b23b4f]"
                label={logoutLabel}
                locale={locale}
              />
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
