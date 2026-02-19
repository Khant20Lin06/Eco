import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'my'] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const resolvedLocale: Locale = locales.includes(locale as Locale) ? (locale as Locale) : 'en';
  const messages = (await import(`./messages/${resolvedLocale}.json`)).default;
  return { locale: resolvedLocale, messages };
});
