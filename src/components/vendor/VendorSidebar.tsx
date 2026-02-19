'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type VendorSidebarProps = {
  locale: string;
};

type Item = {
  key: string;
  label: string;
  href: string;
};

const ITEMS: Omit<Item, 'href'>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'products', label: 'Products' },
  { key: 'orders', label: 'Orders' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'returns', label: 'Returns' }
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function VendorSidebar({ locale }: VendorSidebarProps) {
  const pathname = usePathname();
  const items: Item[] = ITEMS.map((item) => ({
    ...item,
    href: item.key === 'overview' ? `/${locale}/vendor` : `/${locale}/vendor/${item.key}`
  }));

  return (
    <aside className="surface h-fit overflow-hidden p-0">
      <div className="border-b border-[#e1e8ff] bg-[#f7f9ff] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6797]">Vendor Panel</p>
      </div>
      <nav className="space-y-1 p-3">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={
                active
                  ? 'block rounded-xl border border-[#bfcfff] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#2a46aa]'
                  : 'block rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[#2a3361] hover:border-[#d6deff] hover:bg-[#f6f8ff]'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
