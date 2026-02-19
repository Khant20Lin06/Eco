'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AddressItem,
  createAddress,
  createOrder,
  getCart,
  kbzpayCheckout,
  listAddresses,
  listPickupLocations,
  listShippingRates,
  stripeCheckout,
  waveCheckout,
} from '../../../lib/api';
import { useAuthSession } from '../../../lib/hooks/use-auth-session';
import { notifyHeaderCountsRefresh } from '../../../lib/ui-events';

type CartItem = {
  id: string;
  qty: number;
  unitPrice: number;
  variant: {
    id: string;
    currency: string;
    product?: {
      title: string;
    };
  };
};

type CartPayload = {
  id?: string;
  vendorId?: string;
  currency?: string;
  items: CartItem[];
};

type PickupLocation = {
  id: string;
  name: string;
  line1: string;
  city: string;
  country: string;
  hours?: string | null;
};

type ShippingRateInfo = {
  available: boolean;
  flatRate: number | null;
  currency: string;
};

type CreateAddressForm = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string;
};

const EMPTY_ADDRESS_FORM: CreateAddressForm = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal: '',
  country: '',
  phone: '',
};

type CheckoutPageProps = {
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

function normalizeAddresses(payload: Awaited<ReturnType<typeof listAddresses>>) {
  return Array.isArray(payload) ? payload : payload.items;
}

function getReadableApiMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }
  const match = error.message.match(/^API error \d+:\s*(.+)$/);
  if (match?.[1]) {
    return match[1];
  }
  return error.message || fallback;
}

export default function CheckoutPage({ params: { locale } }: CheckoutPageProps) {
  const router = useRouter();
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cart, setCart] = useState<CartPayload>({ items: [] });
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [shippingRate, setShippingRate] = useState<ShippingRateInfo | null>(null);

  const [fulfillment, setFulfillment] = useState<'SHIPPING' | 'PICKUP'>('SHIPPING');
  const [shippingAddrId, setShippingAddrId] = useState('');
  const [pickupLocId, setPickupLocId] = useState('');
  const [mmkProvider, setMmkProvider] = useState<'WAVE' | 'KBZPAY'>('WAVE');
  const [addressForm, setAddressForm] = useState<CreateAddressForm>(EMPTY_ADDRESS_FORM);

  const currency = cart.currency ?? cart.items[0]?.variant.currency ?? 'USD';
  const subtotal = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    [cart.items],
  );
  const shippingFee = shippingRate?.flatRate ?? 0;
  const total = subtotal + shippingFee;

  function clearCheckoutCartState() {
    setCart({ items: [] });
    setShippingRate(null);
    setPickupLocId('');
  }

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!accessToken) {
      setError('Please login to checkout.');
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);

    Promise.all([getCart<CartPayload>(accessToken), listAddresses(accessToken)])
      .then(async ([cartRes, addressRes]) => {
        if (!alive) {
          return;
        }
        const normalizedCart: CartPayload = {
          id: cartRes.id,
          vendorId: cartRes.vendorId,
          currency: cartRes.currency,
          items: cartRes.items ?? [],
        };
        const normalizedAddresses = normalizeAddresses(addressRes);

        setCart(normalizedCart);
        setAddresses(normalizedAddresses);
        setShippingAddrId(normalizedAddresses[0]?.id ?? '');

        if (normalizedCart.vendorId) {
          const pickupRes = await listPickupLocations(
            { vendorId: normalizedCart.vendorId },
            accessToken,
          );
          if (!alive) {
            return;
          }
          setPickupLocations(pickupRes);
          setPickupLocId(pickupRes[0]?.id ?? '');
        }

        setError(null);
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load checkout data.');
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

  useEffect(() => {
    if (!accessToken || !cart.vendorId || fulfillment !== 'SHIPPING') {
      setShippingRate(null);
      return;
    }
    const selected = addresses.find((item) => item.id === shippingAddrId);
    if (!selected) {
      setShippingRate(null);
      return;
    }

    let alive = true;
    listShippingRates({ vendorId: cart.vendorId, country: selected.country }, accessToken)
      .then((res) => {
        if (alive) {
          setShippingRate({
            available: res.available,
            flatRate: res.flatRate,
            currency: res.currency,
          });
        }
      })
      .catch(() => {
        if (alive) {
          setShippingRate(null);
        }
      });

    return () => {
      alive = false;
    };
  }, [accessToken, cart.vendorId, fulfillment, addresses, shippingAddrId]);

  async function onCreateAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    try {
      const created = await createAddress(
        {
          name: addressForm.name,
          line1: addressForm.line1,
          line2: addressForm.line2 || undefined,
          city: addressForm.city,
          state: addressForm.state || undefined,
          postal: addressForm.postal,
          country: addressForm.country.toUpperCase(),
          phone: addressForm.phone || undefined,
        },
        accessToken,
      );
      setAddresses((prev) => [created, ...prev]);
      setShippingAddrId(created.id);
      setAddressForm(EMPTY_ADDRESS_FORM);
      setError(null);
      setMessage('Address added.');
    } catch {
      setError('Failed to create address.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onPlaceOrder() {
    if (!accessToken) {
      return;
    }
    if (cart.items.length === 0) {
      setError('Cart is empty.');
      return;
    }

    if (fulfillment === 'SHIPPING') {
      if (!shippingAddrId) {
        setError('Please select shipping address.');
        return;
      }
      if (!shippingRate?.available) {
        setError('Shipping unavailable for selected country.');
        return;
      }
    } else if (!pickupLocId) {
      setError('Please select pickup location.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    let createdOrderId: string | null = null;
    try {
      const order = await createOrder<{ id: string; currency: string }>(
        {
          fulfillment,
          shippingAddrId: fulfillment === 'SHIPPING' ? shippingAddrId : undefined,
          pickupLocId: fulfillment === 'PICKUP' ? pickupLocId : undefined,
        },
        accessToken,
      );
      createdOrderId = order.id;

      if (order.currency === 'USD') {
        const checkout = await stripeCheckout(order.id, accessToken);
        if (checkout.url) {
          window.location.href = checkout.url;
          return;
        }
        clearCheckoutCartState();
        notifyHeaderCountsRefresh();
        setMessage('Order created. Stripe checkout session created.');
      } else {
        if (mmkProvider === 'WAVE') {
          await waveCheckout(order.id, accessToken);
        } else {
          await kbzpayCheckout(order.id, accessToken);
        }
        clearCheckoutCartState();
        notifyHeaderCountsRefresh();
        setMessage('Order paid successfully.');
        router.push(`/${locale}/orders`);
      }
    } catch (error) {
      if (createdOrderId) {
        clearCheckoutCartState();
        notifyHeaderCountsRefresh();
        setError(
          `Order was created (${createdOrderId}) but payment step failed. Please open Orders and retry payment.`
        );
      } else {
        setError(getReadableApiMessage(error, 'Failed to place order.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="surface p-5 md:p-6">
        <h1 className="text-2xl font-semibold text-[#181f46]">Checkout</h1>
        <p className="mt-1 text-sm text-[#5d6486]">Shipping or pickup with single-vendor cart policy.</p>
      </div>

      {error ? (
        <div className="surface border-[#ffd7dd] bg-[#fff5f6] p-4 text-sm text-[#b12f43]">{error}</div>
      ) : null}
      {message ? (
        <div className="surface border-[#d1eeda] bg-[#f1fbf4] p-4 text-sm text-[#17724b]">{message}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="surface p-4">
            <h2 className="text-lg font-semibold text-[#1a224d]">Order items</h2>
            {loading ? (
              <p className="mt-3 text-sm text-[#5d6486]">Loading cart...</p>
            ) : cart.items.length === 0 ? (
              <p className="mt-3 text-sm text-[#5d6486]">
                Cart is empty.{' '}
                <Link className="font-semibold text-[#3550c0] underline" href={`/${locale}/products`}>
                  Browse products
                </Link>
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#d8e1ff] bg-[#fbfcff] px-3 py-2 text-sm"
                  >
                    <p className="font-semibold text-[#1c2550]">{item.variant.product?.title ?? 'Product'}</p>
                    <p className="text-[#5f6890]">
                      {item.qty} x {formatMoney(item.unitPrice, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface p-4">
            <h2 className="text-lg font-semibold text-[#1a224d]">Fulfillment</h2>
            <div className="mt-3 flex gap-2">
              <button
                className={
                  fulfillment === 'SHIPPING'
                    ? 'btn-primary rounded-xl px-4 py-2 text-sm font-semibold'
                    : 'rounded-xl border border-[#cbd6ff] bg-white px-4 py-2 text-sm font-semibold text-[#394784]'
                }
                type="button"
                onClick={() => setFulfillment('SHIPPING')}
              >
                Shipping
              </button>
              <button
                className={
                  fulfillment === 'PICKUP'
                    ? 'btn-primary rounded-xl px-4 py-2 text-sm font-semibold'
                    : 'rounded-xl border border-[#cbd6ff] bg-white px-4 py-2 text-sm font-semibold text-[#394784]'
                }
                type="button"
                onClick={() => setFulfillment('PICKUP')}
              >
                Pickup
              </button>
            </div>

            {fulfillment === 'SHIPPING' ? (
              <div className="mt-4 space-y-3">
                <select
                  className="w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-sm"
                  value={shippingAddrId}
                  onChange={(event) => setShippingAddrId(event.target.value)}
                >
                  <option value="">Select shipping address</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.name} - {address.line1}, {address.city}, {address.country}
                    </option>
                  ))}
                </select>
                {shippingRate ? (
                  <p className="text-sm text-[#42538f]">
                    Shipping fee:{' '}
                    {shippingRate.available
                      ? formatMoney(shippingRate.flatRate ?? 0, shippingRate.currency)
                      : 'Unavailable'}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4">
                <select
                  className="w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-sm"
                  value={pickupLocId}
                  onChange={(event) => setPickupLocId(event.target.value)}
                >
                  <option value="">Select pickup location</option>
                  {pickupLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} - {location.city}, {location.country}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="surface p-4">
            <h2 className="text-lg font-semibold text-[#1a224d]">Add shipping address</h2>
            <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={onCreateAddress}>
              <input
                className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                placeholder="Name"
                value={addressForm.name}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <input
                className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                placeholder="Phone"
                value={addressForm.phone}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <input
                className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm md:col-span-2"
                placeholder="Address line 1"
                value={addressForm.line1}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, line1: event.target.value }))}
                required
              />
              <input
                className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm md:col-span-2"
                placeholder="Address line 2 (optional)"
                value={addressForm.line2}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, line2: event.target.value }))}
              />
              <input
                className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                placeholder="City"
                value={addressForm.city}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))}
                required
              />
              <input
                className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                placeholder="State"
                value={addressForm.state}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, state: event.target.value }))}
              />
              <input
                className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                placeholder="Postal"
                value={addressForm.postal}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, postal: event.target.value }))}
                required
              />
              <input
                className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                placeholder="Country (US/MM)"
                value={addressForm.country}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, country: event.target.value }))}
                required
              />
              <div className="md:col-span-2">
                <button
                  className="rounded-xl border border-[#c6d5ff] bg-white px-4 py-2 text-sm font-semibold text-[#3447a2]"
                  type="submit"
                  disabled={submitting}
                >
                  Save address
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="surface h-fit p-4">
          <h2 className="text-lg font-semibold text-[#181f46]">Payment</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between text-[#5d6486]">
              <dt>Subtotal</dt>
              <dd>{formatMoney(subtotal, currency)}</dd>
            </div>
            <div className="flex items-center justify-between text-[#5d6486]">
              <dt>Shipping</dt>
              <dd>{formatMoney(shippingFee, currency)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-[#e0e7ff] pt-2 text-[#1f295d]">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold">{formatMoney(total, currency)}</dd>
            </div>
          </dl>

          {currency === 'MMK' ? (
            <div className="mt-4 rounded-xl border border-[#d8e1ff] bg-[#f7faff] p-3">
              <p className="text-xs uppercase tracking-wide text-[#6070a4]">MMK Provider</p>
              <div className="mt-2 flex gap-2">
                <button
                  className={
                    mmkProvider === 'WAVE'
                      ? 'btn-secondary rounded-lg px-3 py-1.5 text-xs font-semibold'
                      : 'rounded-lg border border-[#c8d6ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3e4d91]'
                  }
                  onClick={() => setMmkProvider('WAVE')}
                  type="button"
                >
                  Wave
                </button>
                <button
                  className={
                    mmkProvider === 'KBZPAY'
                      ? 'btn-secondary rounded-lg px-3 py-1.5 text-xs font-semibold'
                      : 'rounded-lg border border-[#c8d6ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3e4d91]'
                  }
                  onClick={() => setMmkProvider('KBZPAY')}
                  type="button"
                >
                  KBZPay
                </button>
              </div>
            </div>
          ) : null}

          <button
            className="btn-primary mt-5 w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            onClick={onPlaceOrder}
            type="button"
            disabled={loading || submitting || cart.items.length === 0}
          >
            {submitting ? 'Processing...' : 'Place order & pay'}
          </button>
        </aside>
      </div>
    </section>
  );
}
