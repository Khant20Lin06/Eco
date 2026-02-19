export const CURRENCY_PREFERENCE_COOKIE = 'eco_currency';
export const CURRENCY_PREFERENCE_CHANGED_EVENT = 'eco:currency-preference-changed';

export type AppCurrency = 'USD' | 'MMK';

export function normalizeCurrencyCode(value: string | null | undefined): AppCurrency {
  return value === 'MMK' ? 'MMK' : 'USD';
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const key = `${name}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(key)) {
      return decodeURIComponent(trimmed.slice(key.length));
    }
  }
  return null;
}

export function getClientCurrencyPreference(): AppCurrency {
  return normalizeCurrencyCode(readCookieValue(CURRENCY_PREFERENCE_COOKIE));
}

export function setClientCurrencyPreference(currency: AppCurrency) {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${CURRENCY_PREFERENCE_COOKIE}=${currency}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.dispatchEvent(
    new CustomEvent<AppCurrency>(CURRENCY_PREFERENCE_CHANGED_EVENT, { detail: currency })
  );
}
