import type { ReactNode } from 'react';
import AdminSidebar from '../../../components/admin/AdminSidebar';

type AdminLayoutProps = {
  children: ReactNode;
  params: { locale: string };
};

export default function AdminLayout({ children, params: { locale } }: AdminLayoutProps) {
  return (
    <section className="space-y-4">
      <header className="surface px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#5f6994]">Home / Admin</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#181f46]">Marketplace Command Center</h1>
          </div>
          <input
            className="w-full max-w-xs rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-sm text-[#1e2754]"
            placeholder="Search admin panel..."
          />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <AdminSidebar locale={locale} />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
