'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { register } from '../../../lib/api';

type RegisterRole = 'CUSTOMER' | 'VENDOR';

type RegisterPageProps = {
  params: { locale: string };
};

export default function RegisterPage({ params: { locale } }: RegisterPageProps) {
  const t = useTranslations('auth');
  const router = useRouter();

  const [role, setRole] = useState<RegisterRole>('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loginHref = useMemo(() => `/${locale}/login`, [locale]);
  const verifyHref = useMemo(() => `/${locale}/verify-email`, [locale]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await register({
        email: email.trim(),
        password,
        role,
      locale,
      });
      const params = new URLSearchParams({ email: email.trim() });
      if (result.verifyToken) {
        params.set('token', result.verifyToken);
      }
      router.push(`${verifyHref}?${params.toString()}`);
    } catch {
      setError(t('registerFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d8e1ff] bg-gradient-to-br from-[#fff5f8] to-[#edf2ff] p-5">
        <p className="text-xs uppercase tracking-wide text-[#5e6791]">Create Account</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#181f46]">{t('registerTitle')}</h1>
        <p className="mt-2 text-sm text-[#5c648a]">{t('registerSubtitle')}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-[#3a4476]">{t('role')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-sm text-[#2a3361]">
              <input
                checked={role === 'CUSTOMER'}
                onChange={() => setRole('CUSTOMER')}
                type="radio"
                name="role"
              />
              {t('customer')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-sm text-[#2a3361]">
              <input
                checked={role === 'VENDOR'}
                onChange={() => setRole('VENDOR')}
                type="radio"
                name="role"
              />
              {t('vendor')}
            </label>
          </div>
        </fieldset>

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
          {submitting ? t('registering') : t('register')}
        </button>
      </form>

      <p className="border-t border-[#e2e8ff] pt-4 text-sm text-[#5c648a]">
        {t('hasAccount')}{' '}
        <Link className="font-semibold text-[#3349ad] underline" href={loginHref}>
          {t('login')}
        </Link>
      </p>
    </section>
  );
}
