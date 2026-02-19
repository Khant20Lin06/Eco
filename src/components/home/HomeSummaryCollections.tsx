'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listCategories, listProducts, type ProductItem } from '../../lib/api';

type HomeSummaryCollectionsProps = {
  locale: string;
  isAuthed: boolean;
};

type HomeCategory = {
  id: string;
  name: string;
  slug: string;
};

type HomeProduct = {
  id: string;
  title: string;
  categoryId: string;
  imageUrl?: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
};

function mapHomeProduct(product: ProductItem): HomeProduct {
  return {
    id: product.id,
    title: product.title,
    categoryId: product.categoryId,
    imageUrl: product.images[0]?.url ?? null,
    status: product.status
  };
}

export default function HomeSummaryCollections({
  locale,
  isAuthed
}: HomeSummaryCollectionsProps) {
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      listCategories({ locale }),
      listProducts({ limit: 50, locale })
    ])
      .then(([categoryRes, productRes]) => {
        if (!alive) {
          return;
        }

        setCategories(
          categoryRes.items.map((category) => ({
            id: category.id,
            name: category.name || category.en_name || category.mm_name || 'Category',
            slug: category.slug
          }))
        );
        setProducts(productRes.items.map(mapHomeProduct));
        setError(null);
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setCategories([]);
        setProducts([]);
        setError('Failed to load collections.');
      });

    return () => {
      alive = false;
    };
  }, [locale]);

  const activeProducts = useMemo(
    () => products.filter((item) => item.status === 'ACTIVE'),
    [products]
  );
  const categoryItems = categories.slice(0, 14);

  const collectionCards = useMemo(() => {
    const firstProductByCategory = new Map<string, HomeProduct>();
    for (const product of activeProducts) {
      if (!firstProductByCategory.has(product.categoryId)) {
        firstProductByCategory.set(product.categoryId, product);
      }
    }

    return categoryItems.slice(0, 6).map((category) => {
      const cover = firstProductByCategory.get(category.id);
      return {
        id: category.id,
        name: category.name,
        imageUrl: cover?.imageUrl ?? null
      };
    });
  }, [activeProducts, categoryItems]);

  return (
    <>
      <div className="surface grid gap-3 p-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#dbe2ff] bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-[#5d6486]">Products</p>
          <p className="mt-1 text-xl font-semibold text-[#1b2452]">{activeProducts.length}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2ff] bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-[#5d6486]">Categories</p>
          <p className="mt-1 text-xl font-semibold text-[#1b2452]">{categoryItems.length}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2ff] bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-[#5d6486]">{isAuthed ? 'Account' : 'Signup'}</p>
          {!isAuthed ? (
            <Link className="btn-secondary mt-2 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold" href={`/${locale}/register`}>
              Create Account
            </Link>
          ) : (
            <Link className="mt-2 inline-flex rounded-full border border-[#cad7ff] px-3 py-1.5 text-xs font-semibold text-[#2d438a]" href={`/${locale}/orders`}>
              Go to Orders
            </Link>
          )}
        </div>
      </div>

      <section id="collections" className="surface space-y-4 p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[#181f46]">Popular Collections</h2>
            <p className="text-sm text-[#60709b]">Pick from our best-selling product clusters.</p>
          </div>
          <Link className="text-sm font-semibold text-[#3550be] hover:underline" href={`/${locale}/products`}>
            View all collections
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {collectionCards.map((card) => (
            <Link
              key={card.id}
              href={`/${locale}/products?categoryId=${card.id}`}
              className="surface group block overflow-hidden p-3 transition-all hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(29,49,119,0.14)]"
            >
              <div className="h-28 overflow-hidden rounded-xl bg-gradient-to-br from-[#d7e5ff] to-[#f2f7ff]">
                {card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={card.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    src={card.imageUrl}
                  />
                ) : (
                  <div className="grid h-full place-items-center text-xs font-semibold text-[#4a5a94]">{card.name}</div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-[#1c2453]">{card.name}</p>
            </Link>
          ))}
        </div>
        {error ? <p className="text-sm text-[#b63a52]">{error}</p> : null}
      </section>
    </>
  );
}
