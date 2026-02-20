'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  listBlogs,
  listProducts,
  listReviews,
  type ProductItem,
  type ReviewListItem
} from '../../lib/api';
import DotCarousel from './DotCarousel';

type HomeReviewsBlogsProps = {
  locale: string;
};

type HomeReview = {
  id: string;
  rating: number;
  comment: string;
  productId?: string;
};

type HomeBlog = {
  id: string;
  title: string;
  excerpt: string;
  coverImage?: string | null;
  color?: string;
};

type HomeProduct = {
  id: string;
  title: string;
  imageUrl?: string | null;
};

const FALLBACK_REVIEW_ITEMS: HomeReview[] = [
  {
    id: 'seed-review-fallback-1',
    rating: 5,
    comment: 'Fast delivery, premium packaging, and quality exactly as shown.',
  },
  {
    id: 'seed-review-fallback-2',
    rating: 5,
    comment: 'Category filtering and checkout are super smooth. Very clean shopping flow.',
  },
  {
    id: 'seed-review-fallback-3',
    rating: 4,
    comment: 'Great value products and clear eco descriptions before buying.',
  },
  {
    id: 'seed-review-fallback-4',
    rating: 5,
    comment: 'Support replied quickly and return process was straightforward.',
  },
  {
    id: 'seed-review-fallback-5',
    rating: 4,
    comment: 'Good eco variety with clear vendor details and fast updates.',
  },
  {
    id: 'seed-review-fallback-6',
    rating: 5,
    comment: 'Packaging quality and product condition were excellent.',
  },
];

const REVIEW_PERSONAS = [
  { name: 'KYLIE ZAMORA', role: 'FASHION DESIGNER' },
  { name: 'CORY ZAMORA', role: 'FASHION INFLUENCER' },
  { name: 'HERMAN MILLER', role: 'TRISH BOUTIQUE' },
];

const REVIEW_PERSONA_FALLBACK = { name: 'ECO CUSTOMER', role: 'VERIFIED BUYER' };

const BLOG_FALLBACK_ITEMS: HomeBlog[] = [
  {
    id: 'blog-fallback-1',
    title: 'Build a low-waste morning routine',
    excerpt: 'Simple product swaps for a cleaner daily habit.',
    color: 'from-[#d6e7ff] to-[#f4f8ff]',
  },
  {
    id: 'blog-fallback-2',
    title: 'How to choose durable eco products',
    excerpt: 'What to check before adding items to your cart.',
    color: 'from-[#def8ea] to-[#f6fffb]',
  },
  {
    id: 'blog-fallback-3',
    title: 'Smart home energy saving essentials',
    excerpt: 'Top picks to reduce cost and power waste.',
    color: 'from-[#efe4ff] to-[#f9f5ff]',
  },
  {
    id: 'blog-fallback-4',
    title: 'Eco shopping checklist for every order',
    excerpt: 'How to verify product quality before checkout.',
    color: 'from-[#ffe9de] to-[#fff6f2]',
  },
  {
    id: 'blog-fallback-5',
    title: 'Durable fashion pieces that last longer',
    excerpt: 'A practical guide to reduce fast-fashion waste.',
    color: 'from-[#e7f6e9] to-[#f4fff6]',
  },
  {
    id: 'blog-fallback-6',
    title: 'Water-saving choices for apartment living',
    excerpt: 'Small upgrades with measurable monthly impact.',
    color: 'from-[#e6f3ff] to-[#f5faff]',
  },
];

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function mapHomeProduct(product: ProductItem): HomeProduct {
  return {
    id: product.id,
    title: product.title,
    imageUrl: product.images[0]?.url ?? null
  };
}

function mapReview(review: ReviewListItem): HomeReview {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment?.trim() || 'Great product and smooth order flow.',
    productId: review.orderItem?.variant?.productId
  };
}

export default function HomeReviewsBlogs({ locale }: HomeReviewsBlogsProps) {
  const [reviews, setReviews] = useState<HomeReview[]>([]);
  const [blogs, setBlogs] = useState<HomeBlog[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      listReviews(),
      listBlogs({ limit: 12 }),
      listProducts({ limit: 50, locale })
    ])
      .then(([reviewRes, blogRes, productRes]) => {
        if (!alive) {
          return;
        }

        setReviews(reviewRes.map(mapReview));
        setBlogs(
          blogRes.items.map((post) => ({
            id: post.id,
            title: post.title,
            excerpt: post.excerpt,
            coverImage: post.coverImage
          }))
        );
        setProducts(productRes.items.map(mapHomeProduct));
        setError(null);
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setReviews([]);
        setBlogs([]);
        setProducts([]);
        setError('Failed to load reviews and blogs.');
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [locale]);

  const displayReviews = useMemo(
    () => [...reviews, ...FALLBACK_REVIEW_ITEMS].slice(0, 10),
    [reviews]
  );
  const displayBlogs = useMemo(
    () => [...blogs, ...BLOG_FALLBACK_ITEMS].slice(0, 10),
    [blogs]
  );
  const reviewSlides = useMemo(() => chunkArray(displayReviews, 3), [displayReviews]);
  const blogSlides = useMemo(() => chunkArray(displayBlogs, 3), [displayBlogs]);
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  return (
    <>
      <section id="reviews" className="surface space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#171d44]">Happy Clients</h2>
          <p className="text-sm text-[#5d6486]">We constantly work to make sure they&apos;re happy!</p>
        </div>
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <article
                key={`review-loading-${index + 1}`}
                className="rounded-2xl border border-[#e7e7ea] bg-[#f3f3f5] px-8 py-7"
              >
                <div className="h-4 w-20 animate-pulse rounded bg-[#f7cf8f]" />
                <div className="mt-5 h-4 w-full animate-pulse rounded bg-[#e1e1e5]" />
                <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-[#e1e1e5]" />
                <div className="mt-2 h-4 w-10/12 animate-pulse rounded bg-[#e1e1e5]" />
                <div className="mt-8 h-5 w-40 animate-pulse rounded bg-[#dddde4]" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-[#e3e3e8]" />
                <div className="mt-7 h-12 w-full animate-pulse rounded bg-[#e6e6ec]" />
              </article>
            ))}
          </div>
        ) : (
          <DotCarousel intervalMs={6200}>
            {reviewSlides.map((slide, slideIndex) => (
              <div key={`review-slide-${slideIndex + 1}`} className="grid gap-6 md:grid-cols-3">
                {slide.map((review, index) => {
                  const absoluteIndex = slideIndex * 3 + index;
                  const persona =
                    REVIEW_PERSONAS[absoluteIndex % REVIEW_PERSONAS.length] ??
                    REVIEW_PERSONA_FALLBACK;
                  const product = review.productId ? productById.get(review.productId) : undefined;
                  const stars = '★'.repeat(Math.max(1, Math.min(5, review.rating)));

                  return (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-[#e7e7ea] bg-[#f3f3f5] px-8 py-7 shadow-[0_20px_50px_rgba(22,28,55,0.04)]"
                    >
                      <p className="text-lg tracking-wide text-[#f0a63b]">{stars}</p>
                      <h3 className="mt-4 text-[34px] font-semibold leading-none text-[#1d2247]">"</h3>
                      <p className="mt-3 line-clamp-4 text-lg leading-relaxed text-[#2f3350]">{review.comment}</p>

                      <div className="mt-8">
                        <p className="text-2xl font-semibold tracking-wide text-[#1d2247]">{persona.name}</p>
                        <p className="mt-1 text-sm font-semibold tracking-[0.08em] text-[#4a4f71]">{persona.role}</p>
                      </div>

                      <div className="mt-7 flex items-center gap-4 border-t border-[#dfdfe3] pt-5">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-white ring-1 ring-[#dddddf]">
                          {product?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt={product.title} className="h-full w-full object-cover" src={product.imageUrl} />
                          ) : (
                            <div className="grid h-full place-items-center text-[10px] font-semibold text-[#70779d]">
                              ECO
                            </div>
                          )}
                        </div>
                        <p className="line-clamp-2 text-xl text-[#222844]">{product?.title ?? 'Featured Product'}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </DotCarousel>
        )}
      </section>

      <section className="surface space-y-4 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#181f46]">Latest From Our Blog</h2>
          <p className="text-sm text-[#60709b]">Guides and shopping tips for better choices.</p>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <article key={`blog-loading-${index + 1}`} className="surface overflow-hidden">
                <div className="h-36 animate-pulse bg-[#e8eeff]" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-[#e6ebff]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[#edf1ff]" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-[#edf1ff]" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <DotCarousel intervalMs={6800}>
            {blogSlides.map((slide, slideIndex) => (
              <div key={`blog-slide-${slideIndex + 1}`} className="grid gap-4 md:grid-cols-3">
                {slide.map((item) => (
                  <article key={item.id} className="surface overflow-hidden">
                    <div className={`h-36 bg-gradient-to-br ${item.color ?? 'from-[#d6e7ff] to-[#f4f8ff]'}`}>
                      {item.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={item.title} className="h-full w-full object-cover" src={item.coverImage} />
                      ) : null}
                    </div>
                    <div className="space-y-2 p-4">
                      <h3 className="text-sm font-semibold text-[#1c2453]">{item.title}</h3>
                      <p className="text-xs text-[#60709b]">{item.excerpt}</p>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </DotCarousel>
        )}
        {error ? <p className="text-sm text-[#b63a52]">{error}</p> : null}
      </section>
    </>
  );
}
