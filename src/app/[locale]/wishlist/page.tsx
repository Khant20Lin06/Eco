'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VariantPickerModal from '../../../components/product/VariantPickerModal';
import {
  addCartItem,
  listWishlist,
  removeWishlistItem,
} from '../../../lib/api';
import type { ProductItem, WishlistItem } from '../../../lib/api';
import { useAuthSession } from '../../../lib/hooks/use-auth-session';
import { notifyHeaderCountsRefresh } from '../../../lib/ui-events';

type WishlistPageProps = {
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

export default function WishlistPage({ params: { locale } }: WishlistPageProps) {
  const router = useRouter();
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [pickerProduct, setPickerProduct] = useState<ProductItem | null>(null);

  async function reload(token: string) {
    const res = await listWishlist(token);
    setItems(res.items);
  }

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!accessToken) {
      setError('Please login to see wishlist.');
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    reload(accessToken)
      .then(() => {
        if (alive) {
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load wishlist.');
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

  async function onRemove(productId: string) {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await removeWishlistItem(productId, accessToken);
      await reload(accessToken);
      notifyHeaderCountsRefresh();
      setMessage('Removed from wishlist.');
    } catch {
      setError('Failed to remove wishlist item.');
    } finally {
      setWorking(false);
    }
  }

  function onAddToCart(item: WishlistItem) {
    if (!accessToken) {
      setMessage('Please login first.');
      router.push(`/${locale}/login`);
      return;
    }
    if (item.product.variants.length === 0) {
      setMessage('No purchasable variant.');
      return;
    }
    setMessage(null);
    setPickerProduct(item.product);
  }

  async function onConfirmAddToCart(input: { variantId: string; qty: number }) {
    if (!accessToken || !pickerProduct) {
      return;
    }
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await addCartItem(input, accessToken);
      notifyHeaderCountsRefresh();
      setPickerProduct(null);
      setMessage(`Added "${pickerProduct.title}" to cart.`);
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        setMessage('Single-vendor cart only. Clear cart first.');
        router.push(`/${locale}/cart`);
      } else {
        setError('Failed to add item to cart.');
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="surface p-5 md:p-6">
        <h1 className="text-2xl font-semibold text-[#181f46]">Saved / Wishlist</h1>
        <p className="mt-1 text-sm text-[#5d6486]">
          Your saved products. Manage and move to cart anytime.
        </p>
      </div>

      {error ? (
        <div className="surface border-[#ffd7dd] bg-[#fff5f6] p-4 text-sm text-[#b12f43]">{error}</div>
      ) : null}
      {message ? (
        <div className="surface border-[#d1eeda] bg-[#f1fbf4] p-4 text-sm text-[#17724b]">{message}</div>
      ) : null}

      {loading ? (
        <div className="surface p-4 text-sm text-[#5d6486]">Loading wishlist...</div>
      ) : items.length === 0 ? (
        <div className="surface p-4 text-sm text-[#5d6486]">
          No saved items yet.{' '}
          <Link className="font-semibold text-[#3550be] hover:underline" href={`/${locale}/products`}>
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const product = item.product;
            const image = product.images[0]?.url;
            const variant = product.variants[0];

            return (
              <article key={item.id} className="surface overflow-hidden">
                <div className="h-44 bg-gradient-to-br from-[#ffe7ed] to-[#e7ecff]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={product.title} className="h-full w-full object-cover" src={image} />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-[#6b749c]">No image</div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="line-clamp-1 text-base font-semibold text-[#1b2148]">{product.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-[#5d6486]">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-[#19235f]">
                      {variant ? formatMoney(variant.price, variant.currency) : '-'}
                    </p>
                    <span className="text-xs text-[#5d6486]">{product.category?.name ?? 'Category'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      className="rounded-lg border border-[#c9d6ff] px-3 py-2 text-center text-sm font-medium text-[#3d4d95]"
                      href={`/${locale}/product/${product.id}`}
                    >
                      Detail
                    </Link>
                    <button
                      className="btn-primary rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                      onClick={() => onAddToCart(item)}
                      type="button"
                      disabled={working}
                    >
                      Add Cart
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      className="rounded-lg border border-[#ffc2cd] bg-white px-3 py-2 text-sm font-semibold text-[#c33f53] disabled:opacity-60"
                      onClick={() => onRemove(product.id)}
                      type="button"
                      disabled={working}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <VariantPickerModal
        locale={locale}
        onClose={() => setPickerProduct(null)}
        onConfirm={onConfirmAddToCart}
        open={Boolean(pickerProduct)}
        title={pickerProduct?.title ?? ''}
        variants={pickerProduct?.variants ?? []}
      />
    </section>
  );
}
