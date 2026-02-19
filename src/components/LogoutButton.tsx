'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { logout } from '../lib/api';
import { clearClientAuthSession } from '../lib/auth';

type LogoutButtonProps = {
  locale: string;
  label: string;
  className?: string;
};

export default function LogoutButton({ locale, label, className }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onLogout() {
    startTransition(async () => {
      try {
        await logout();
      } catch {
        // Ignore network errors and still clear local session.
      }
      clearClientAuthSession();
      router.replace(`/${locale}/login`);
      router.refresh();
    });
  }

  return (
    <button className={className} disabled={pending} onClick={onLogout} type="button">
      {pending ? `${label}...` : label}
    </button>
  );
}
