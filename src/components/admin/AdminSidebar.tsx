'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '../LogoutButton';
import { useAuthSession } from '../../lib/hooks/use-auth-session';

type AdminSidebarProps = {
  locale: string;
};

type SidebarItem = {
  key: string;
  label: string;
  href: string;
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({ locale }: AdminSidebarProps) {
  const pathname = usePathname();
  const { ready, accessToken } = useAuthSession();
  const hasAccessToken = Boolean(accessToken);
  const items: SidebarItem[] = [
    { key: 'dashboard', label: 'Dashboard', href: `/${locale}/admin` },
    { key: 'vendors', label: 'Vendors', href: `/${locale}/admin/vendors` },
    { key: 'orders', label: 'Orders', href: `/${locale}/admin/orders` },
    { key: 'returns', label: 'Returns', href: `/${locale}/admin/returns` },
    { key: 'tags', label: 'Tags', href: `/${locale}/admin/tags` },
    { key: 'categories', label: 'Categories', href: `/${locale}/admin/categories` },
  ];

  return (
    <aside className="surface h-fit">
      <div className="border-b border-[#e1e8ff] px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-[#5f6994]">Navigation</p>
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
                  ? 'block rounded-lg border border-[#bdd0ff] bg-[#edf3ff] px-3 py-2 text-sm font-medium text-[#2f4bb0]'
                  : 'block rounded-lg px-3 py-2 text-sm text-[#36446f] hover:bg-[#f3f6ff]'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#e1e8ff] p-3">
        {ready ? (
          hasAccessToken ? (
            <LogoutButton
              className="block w-full rounded-lg border border-[#f5c7cf] px-3 py-2 text-sm font-semibold text-[#b3334b] hover:bg-[#fff6f8]"
              label="Logout"
              locale={locale}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/${locale}/login`}
                className="rounded-lg border border-[#cad8ff] px-3 py-2 text-center text-sm font-semibold text-[#2f4bb0] hover:bg-[#edf3ff]"
              >
                Login
              </Link>
              <Link
                href={`/${locale}/register`}
                className="rounded-lg border border-[#cad8ff] px-3 py-2 text-center text-sm font-semibold text-[#2f4bb0] hover:bg-[#edf3ff]"
              >
                Register
              </Link>
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}
