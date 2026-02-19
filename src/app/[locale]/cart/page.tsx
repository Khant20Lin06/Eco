'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getCart, removeCartItem, updateCartItem } from '../../../lib/api';
import { useAuthSession } from '../../../lib/hooks/use-auth-session';
import { notifyHeaderCountsRefresh } from '../../../lib/ui-events';

type CartItem = {
  id: string;
  qty: number;
  unitPrice: number;
  variant: {
    id: string;
    currency: string;
    stockQty: number;
    product?: {
      id: string;
      title: string;
      vendorId: string;
    };
  };
};

type CartPayload = {
  id?: string;
  vendorId?: string;
  currency?: string;
  items: CartItem[];
};

type CartPageProps = {
  params: { locale: string };
};

function formatMoney(amount: number, currency: string) {
  const value = amount / (currency === 'USD' ? 100 : 1);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MMK' ? 'MMK' : 'USD',
    maximumFractionDigits: currency === 'MMK' ? 0 : 2,
  }).format(value);
}

export default function CartPage({ params: { locale } }: CartPageProps) {
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartPayload>({ items: [] });

  async function loadCart(token: string) {
    const res = await getCart<CartPayload>(token);
    setCart({ items: res.items ?? [], id: res.id, vendorId: res.vendorId, currency: res.currency });
  }

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!accessToken) {
      setError('Please login to view cart.');
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    loadCart(accessToken)
      .then(() => {
        if (alive) {
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load cart.');
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [ready, accessToken]);

  const currency = cart.currency ?? cart.items[0]?.variant.currency ?? 'USD';
  const subtotal = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    [cart.items],
  );

  async function onUpdateQty(itemId: string, qty: number) {
    if (!accessToken || qty < 1) {
      return;
    }
    setSaving(true);
    try {
      const res = await updateCartItem<CartPayload>(itemId, { qty }, accessToken);
      setCart({ items: res.items ?? [], id: res.id, vendorId: res.vendorId, currency: res.currency });
      setError(null);
      notifyHeaderCountsRefresh();
    } catch {
      setError('Failed to update item quantity.');
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(itemId: string) {
    if (!accessToken) {
      return;
    }
    setSaving(true);
    try {
      await removeCartItem(itemId, accessToken);
      await loadCart(accessToken);
      setError(null);
      notifyHeaderCountsRefresh();
    } catch {
      setError('Failed to remove item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="surface p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#181f46]">Your Cart</h1>
            <p className="mt-1 text-sm text-[#5d6486]">
              Single-vendor checkout only. Keep items from one vendor per cart.
            </p>
          </div>
          <Link
            className="rounded-xl border border-[#c7d4ff] bg-white px-4 py-2 text-sm font-semibold text-[#3349ad]"
            href={`/${locale}/products`}
          >
            Continue shopping
          </Link>
        </div>
      </div>

      {error ? (
        <div className="surface border-[#ffd7dd] bg-[#fff5f6] p-4 text-sm text-[#b12f43]">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="surface p-4">
          {loading ? (
            <p className="text-sm text-[#5d6486]">Loading cart...</p>
          ) : cart.items.length === 0 ? (
            <p className="text-sm text-[#5d6486]">Your cart is empty.</p>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-[#d8e1ff] bg-[#fbfcff] p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-[#1d2551]">{item.variant.product?.title ?? 'Product'}</p>
                      <p className="text-xs text-[#6270a6]">Variant ID: {item.variant.id}</p>
                      <p className="text-xs text-[#6270a6]">
                        Unit: {formatMoney(item.unitPrice, item.variant.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-20 rounded-lg border border-[#cfd9ff] bg-white px-2 py-1.5 text-sm"
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(event) => onUpdateQty(item.id, Number(event.target.value))}
                        disabled={saving}
                      />
                      <button
                        className="rounded-lg border border-[#ffc2cd] bg-white px-3 py-1.5 text-xs font-semibold text-[#c33f53]"
                        onClick={() => onRemove(item.id)}
                        type="button"
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="surface h-fit p-4">
          <h2 className="text-lg font-semibold text-[#181f46]">Summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between text-[#5d6486]">
              <dt>Items</dt>
              <dd>{cart.items.length}</dd>
            </div>
            <div className="flex items-center justify-between text-[#5d6486]">
              <dt>Subtotal</dt>
              <dd className="font-medium text-[#1e2756]">{formatMoney(subtotal, currency)}</dd>
            </div>
            <div className="flex items-center justify-between text-[#5d6486]">
              <dt>Shipping</dt>
              <dd>Calculated at checkout</dd>
            </div>
          </dl>
          <Link
            className="btn-primary mt-5 block rounded-xl px-4 py-2 text-center text-sm font-semibold"
            href={`/${locale}/checkout`}
          >
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </section>
  );
}
