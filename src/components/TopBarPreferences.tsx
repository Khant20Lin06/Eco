'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  AppCurrency,
  normalizeCurrencyCode,
  setClientCurrencyPreference
} from '../lib/preferences';

type TopBarPreferencesProps = {
  locale: string;
  currency: AppCurrency;
  tone?: 'dark' | 'light';
};

type AppLocale = 'en' | 'my';

function normalizeLocale(value: string): AppLocale {
  return value === 'my' ? 'my' : 'en';
}

function switchLocale(pathname: string, nextLocale: AppLocale): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return `/${nextLocale}`;
  }

  if (segments[0] === 'en' || segments[0] === 'my') {
    segments[0] = nextLocale;
  } else {
    segments.unshift(nextLocale);
  }

  return `/${segments.join('/')}`;
}

export default function TopBarPreferences({
  locale,
  currency,
  tone = 'dark'
}: TopBarPreferencesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = normalizeLocale(locale);
  const [currencyValue, setCurrencyValue] = useState<AppCurrency>(
    normalizeCurrencyCode(currency)
  );

  const currentPath = useMemo(() => pathname || `/${currentLocale}`, [pathname, currentLocale]);

  function handleLocaleChange(nextLocaleValue: string) {
    const nextLocale = normalizeLocale(nextLocaleValue);
    if (nextLocale === currentLocale) {
      return;
    }
    const nextPath = switchLocale(currentPath, nextLocale);
    const query = searchParams.toString();
    router.replace(query ? `${nextPath}?${query}` : nextPath);
  }

  function handleCurrencyChange(nextCurrencyValue: string) {
    const nextCurrency = normalizeCurrencyCode(nextCurrencyValue);
    setCurrencyValue(nextCurrency);
    setClientCurrencyPreference(nextCurrency);
  }

  const selectClassName =
    tone === 'light'
      ? 'h-8 rounded-lg border border-[#d2dcff] bg-white px-2 text-[11px] font-semibold text-[#1d2551] outline-none'
      : 'h-7 rounded border border-white/25 bg-transparent px-2 text-[11px] font-semibold text-white outline-none';

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <select
        aria-label="Language"
        className={selectClassName}
        onChange={(event) => handleLocaleChange(event.target.value)}
        value={currentLocale}
      >
        <option className="text-black" value="en">
          EN
        </option>
        <option className="text-black" value="my">
          MY
        </option>
      </select>
      <select
        aria-label="Currency"
        className={selectClassName}
        onChange={(event) => handleCurrencyChange(event.target.value)}
        value={currencyValue}
      >
        <option className="text-black" value="USD">
          USD $
        </option>
        <option className="text-black" value="MMK">
          MMK Ks
        </option>
      </select>
    </div>
  );
}
