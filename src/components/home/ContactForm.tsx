'use client';

import { FormEvent, useMemo, useState } from 'react';
import { submitContact } from '../../lib/api';

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const INITIAL_FORM_STATE: FormState = {
  name: '',
  email: '',
  subject: '',
  message: ''
};

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canSubmit = useMemo(
    () =>
      form.name.trim().length >= 2 &&
      form.email.trim().length > 0 &&
      form.message.trim().length >= 10 &&
      !isSubmitting,
    [form, isSubmitting]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setNotice(null);
    try {
      await submitContact({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || undefined,
        message: form.message.trim()
      });
      setNotice({ type: 'success', text: 'Message sent successfully. We will contact you soon.' });
      setForm(INITIAL_FORM_STATE);
    } catch {
      setNotice({ type: 'error', text: 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-2" onSubmit={onSubmit}>
      <input
        className="rounded-xl border border-[#d9e2ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#98adff]"
        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        placeholder="Your name"
        type="text"
        value={form.name}
      />
      <input
        className="rounded-xl border border-[#d9e2ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#98adff]"
        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        placeholder="Your email"
        type="email"
        value={form.email}
      />
      <input
        className="rounded-xl border border-[#d9e2ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#98adff]"
        onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
        placeholder="Subject (optional)"
        type="text"
        value={form.subject}
      />
      <textarea
        className="min-h-[110px] rounded-xl border border-[#d9e2ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#98adff]"
        onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
        placeholder="Message"
        value={form.message}
      />
      {notice ? (
        <p className={`text-sm ${notice.type === 'success' ? 'text-[#1f7a4c]' : 'text-[#c2364f]'}`}>
          {notice.text}
        </p>
      ) : null}
      <button className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={!canSubmit} type="submit">
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
