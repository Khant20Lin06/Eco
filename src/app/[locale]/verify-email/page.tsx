'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { resendVerification, verifyEmail } from '../../../lib/api';

type VerifyEmailPageProps = {
  params: { locale: string };
};

export default function VerifyEmailPage({ params: { locale } }: VerifyEmailPageProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const loginHref = useMemo(() => `/${locale}/login`, [locale]);

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setVerifying(true);

    try {
      await verifyEmail({ token: token.trim() });
      setInfo(t('verifySuccess'));
      router.push(loginHref);
    } catch {
      setError(t('verifyFailed'));
    } finally {
      setVerifying(false);
    }
  }

  async function onResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setResending(true);

    try {
      const result = await resendVerification({ email: email.trim() });
      if (result.verifyToken) {
        setToken(result.verifyToken);
        setInfo(t('verifyTokenGenerated'));
      } else {
        setInfo(t('verifyResent'));
      }
    } catch {
      setError(t('verifyResendFailed'));
    } finally {
      setResending(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d8e1ff] bg-gradient-to-br from-[#edf5ff] to-[#f9f3ff] p-5">
        <p className="text-xs uppercase tracking-wide text-[#5e6791]">Security Check</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#181f46]">{t('verifyTitle')}</h1>
        <p className="mt-2 text-sm text-[#5c648a]">{t('verifySubtitle')}</p>
      </div>

      <form className="space-y-4" onSubmit={onVerify}>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#3a4476]">{t('verifyToken')}</span>
          <input
            className="w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-[#1d2551] outline-none transition focus:border-[#7f9bff]"
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
        </label>

        {error ? (
          <p className="rounded-lg border border-[#ffd3d8] bg-[#fff4f5] px-3 py-2 text-sm text-[#b12f43]">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-lg border border-[#cdeedb] bg-[#edfdf4] px-3 py-2 text-sm text-[#1f8457]">
            {info}
          </p>
        ) : null}

        <button
          className="btn-primary w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          disabled={verifying}
          type="submit"
        >
          {verifying ? t('verifying') : t('verifyAction')}
        </button>
      </form>

      <form className="space-y-3 border-t border-[#e2e8ff] pt-4" onSubmit={onResend}>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[#3a4476]">{t('email')}</span>
          <input
            className="w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-[#1d2551] outline-none transition focus:border-[#7f9bff]"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <button
          className="btn-secondary w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          disabled={resending}
          type="submit"
        >
          {resending ? t('sending') : t('resendVerification')}
        </button>
      </form>

      <p className="text-sm text-[#5c648a]">
        {t('hasAccount')}{' '}
        <Link className="font-semibold text-[#3349ad] underline" href={loginHref}>
          {t('login')}
        </Link>
      </p>
    </section>
  );
}
