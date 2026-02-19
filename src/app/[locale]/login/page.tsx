'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { login } from '../../../lib/api';
import { setClientAuthSession } from '../../../lib/auth';
import { AppRole, resolveRoleHome } from '../../../lib/auth-shared';

type LoginPageProps = {
  params: { locale: string };
};

export default function LoginPage({ params: { locale } }: LoginPageProps) {
  const t = useTranslations('auth');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const registerHref = useMemo(() => `/${locale}/register`, [locale]);
  const verifyHref = useMemo(() => `/${locale}/verify-email`, [locale]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await login({ email: email.trim(), password });
      const role = result.user.role as AppRole;
      setClientAuthSession({
        accessToken: result.accessToken,
        role,
      });
      const target = resolveRoleHome(locale, role);
      router.replace(target);
      router.refresh();
    } catch (error) {
      const status =
        error instanceof Error && error.message.startsWith('API error ')
          ? Number(error.message.replace('API error ', ''))
          : null;

      if (status === 401) {
        setError(t('loginFailed'));
      } else {
        setError('Cannot reach login API. Check backend/CORS settings.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d7e0ff] bg-gradient-to-br from-[#fff0f4] to-[#ecf1ff] p-5">
        <p className="text-xs uppercase tracking-wide text-[#5f6690]">Account Access</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#181f46]">{t('loginTitle')}</h1>
        <p className="mt-2 text-sm text-[#5b6388]">{t('loginSubtitle')}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#3a4476]">{t('email')}</span>
          <input
            className="w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-[#1d2551] outline-none transition focus:border-[#7f9bff]"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#3a4476]">{t('password')}</span>
          <input
            className="w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-[#1d2551] outline-none transition focus:border-[#7f9bff]"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        {error ? (
          <p className="rounded-lg border border-[#ffd3d8] bg-[#fff4f5] px-3 py-2 text-sm text-[#b12f43]">
            {error}
          </p>
        ) : null}

        <button
          className="btn-primary w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? t('loggingIn') : t('login')}
        </button>
      </form>

      <div className="space-y-2 border-t border-[#e2e8ff] pt-4 text-sm text-[#5c648a]">
        <p>
          {t('noAccount')}{' '}
          <Link className="font-semibold text-[#3349ad] underline" href={registerHref}>
            {t('register')}
          </Link>
        </p>
        <p>
          {t('needVerify')}{' '}
          <Link className="font-semibold text-[#3349ad] underline" href={verifyHref}>
            {t('verifyAction')}
          </Link>
        </p>
      </div>
    </section>
  );
}
