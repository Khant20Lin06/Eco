'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { login } from '../../../lib/api';
import { setClientAuthSession } from '../../../lib/auth';
import { AppRole, resolveRoleHome } from '../../../lib/auth-shared';

type LoginPageProps = {
  params: { locale: string };
};

function isSafeReturnPath(value: string | null): value is string {
  if (!value) {
    return false;
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    return false;
  }
  return value.startsWith('/en') || value.startsWith('/my');
}

export default function LoginPage({ params: { locale } }: LoginPageProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const registerHref = useMemo(() => `/${locale}/register`, [locale]);

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
      const requestedReturnTo = searchParams.get('returnTo');
      const target = isSafeReturnPath(requestedReturnTo)
        ? requestedReturnTo
        : resolveRoleHome(locale, role);
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
          <div className="relative">
            <input
              className="w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 pr-12 text-[#1d2551] outline-none transition focus:border-[#7f9bff]"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <button
              className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-[#5b6388] transition hover:bg-[#f1f4ff] hover:text-[#3349ad]"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 3l18 18" strokeLinecap="round" />
                  <path d="M10.58 10.58a2 2 0 102.83 2.83" strokeLinecap="round" />
                  <path
                    d="M9.36 5.37A10.94 10.94 0 0112 5c5.05 0 9.27 3.11 10.5 7.5a11.8 11.8 0 01-3.1 5.02M6.61 6.61A11.64 11.64 0 001.5 12.5a11.8 11.8 0 004.72 5.94"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M1.5 12.5C2.73 8.11 6.95 5 12 5s9.27 3.11 10.5 7.5c-1.23 4.39-5.45 7.5-10.5 7.5S2.73 16.89 1.5 12.5z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12.5" r="3" />
                </svg>
              )}
            </button>
          </div>
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
      </div>
    </section>
  );
}
