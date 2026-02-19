import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import RouteChrome from '../../components/chrome/RouteChrome';
import Footer from '../../components/Footer';
import Nav from '../../components/Nav';

const locales = ['en', 'my'];
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <RouteChrome mode="header">
        <Nav locale={locale} />
      </RouteChrome>
      <main>{children}</main>
      <RouteChrome mode="footer">
        <Footer />
      </RouteChrome>
    </NextIntlClientProvider>
  );
}
