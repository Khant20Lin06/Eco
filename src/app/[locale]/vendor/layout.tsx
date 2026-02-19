import Link from 'next/link';
import type { ReactNode } from 'react';
import VendorSidebar from '../../../components/vendor/VendorSidebar';

type VendorLayoutProps = {
  children: ReactNode;
  params: { locale: string };
};

export default function VendorLayout({ children, params: { locale } }: VendorLayoutProps) {
  return (
    <section className="space-y-4">
      <header className="surface overflow-hidden p-0">
        <div className="grid gap-4 bg-gradient-to-r from-[#10245b] via-[#1a3e8f] to-[#1f7aa0] px-5 py-5 text-white md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-white/80">Vendor Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold">Store Operations</h1>
            <p className="mt-1 text-sm text-white/85">Manage catalog, fulfillment, shipping and returns from one panel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-lg border border-white/50 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
              href={`/${locale}/vendor/products`}
            >
              Add Product
            </Link>
            <Link
              className="rounded-lg border border-white/50 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
              href={`/${locale}/vendor/orders`}
            >
              Process Orders
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <VendorSidebar locale={locale} />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
