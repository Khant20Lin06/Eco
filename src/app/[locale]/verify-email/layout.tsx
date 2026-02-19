import type { ReactNode } from 'react';

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-lg py-8">
      <div className="surface p-6 md:p-8">{children}</div>
    </section>
  );
}
