import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  listBlogs,
  listCategories,
  listProducts,
  listReviews,
  type ProductItem,
  type ProductVariant
} from '../../lib/api';
import { AUTH_ROLE_COOKIE } from '../../lib/auth-shared';
import { CURRENCY_PREFERENCE_COOKIE, normalizeCurrencyCode } from '../../lib/preferences';
import ContactForm from '../../components/home/ContactForm';
import DotCarousel from '../../components/home/DotCarousel';
import HeroSlider from '../../components/home/HeroSlider';
import HomeCatalogSection from '../../components/home/HomeCatalogSection';

type HomePageProps = {
  params: { locale: string };
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HeroSlide = {
  title: string;
  text: string;
  badge: string;
  color: string;
  cta?: string;
};

type HomeCategory = {
  id: string;
  name: string;
  slug: string;
};

type HomeProduct = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  imageUrl?: string | null;
  price: number | null;
  currency: string | null;
  variants: ProductVariant[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
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

const SECTION_LINKS = [
  { id: 'collections', label: 'Collections' },
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Products' },
  { id: 'deals', label: 'Deals' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'contact', label: 'Contact' },
];

const HERO_SLIDES: HeroSlide[] = [
  {
    title: 'Luxury Collection',
    text: 'For cool people like you. Fresh arrivals for lifestyle, home and everyday essentials.',
    badge: 'Get 30% OFF',
    color: 'from-[#08b79e] via-[#0e7ca8] to-[#243b8f]',
    cta: 'Explore Now'
  },
  {
    title: 'This Week Highlights',
    text: 'Shop trend products from local vendors with quick checkout and secure payment.',
    badge: 'Weekly Picks',
    color: 'from-[#6432c2] via-[#265ad1] to-[#0f6c9f]',
    cta: 'Shop Deals'
  },
  {
    title: 'Home Appliances Deal',
    text: 'Power-saving products, curated bundles, and trusted marketplace pricing.',
    badge: 'Best Offers',
    color: 'from-[#2b5adf] via-[#2b8ab7] to-[#3fbc99]',
    cta: 'Buy Now'
  },
];

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

const SERVICE_FEATURES = [
  { title: 'Worldwide Shipping', text: 'Secure delivery to US & Myanmar addresses.' },
  { title: 'Easy Returns', text: 'Return flow with clear status tracking.' },
  { title: 'Real-Time Support', text: 'Order updates, chat, and in-app alerts.' },
  { title: 'Secure Payments', text: 'Stripe + MMK providers for safe checkout.' },
];

const BRANDS = ['VOLTAS', 'SAMSUNG', 'APPLE', 'DELL', 'ASUS', 'PHILIPS', 'SONY'];

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

async function loadHomeData(locale: string) {
  const [categoryRes, productRes, reviewRes, blogRes] = await Promise.allSettled([
    listCategories({ locale }),
    listProducts({ limit: 32, locale }),
    listReviews(),
    listBlogs({ limit: 12 }),
  ]);

  const categoryPayload = categoryRes.status === 'fulfilled' ? (categoryRes.value as unknown) : null;
  const categoryItems = Array.isArray(categoryPayload)
    ? categoryPayload
    : Array.isArray((categoryPayload as { items?: unknown } | null)?.items)
      ? ((categoryPayload as { items: unknown[] }).items)
      : [];
  const productPayload = productRes.status === 'fulfilled' ? (productRes.value as unknown) : null;
  const productItems = Array.isArray(productPayload)
    ? productPayload
    : Array.isArray((productPayload as { items?: unknown } | null)?.items)
      ? ((productPayload as { items: unknown[] }).items)
      : [];
  const reviewPayload = reviewRes.status === 'fulfilled' ? (reviewRes.value as unknown) : null;
  const reviewItems = Array.isArray(reviewPayload)
    ? reviewPayload
    : Array.isArray((reviewPayload as { items?: unknown } | null)?.items)
      ? ((reviewPayload as { items: unknown[] }).items)
      : [];
  const blogPayload = blogRes.status === 'fulfilled' ? (blogRes.value as unknown) : null;
  const blogItems = Array.isArray(blogPayload)
    ? blogPayload
    : Array.isArray((blogPayload as { items?: unknown } | null)?.items)
      ? ((blogPayload as { items: unknown[] }).items)
      : [];

  const mapHomeProduct = (product: ProductItem): HomeProduct => ({
    id: product.id,
    title: product.title,
    description: product.description,
    categoryId: product.categoryId,
    imageUrl: product.images[0]?.url ?? null,
    price: product.variants[0]?.price ?? null,
    currency: product.variants[0]?.currency ?? null,
    variants: product.variants,
    status: product.status
  });

  const normalizedCategoryItems = categoryItems as Array<{
    id: string;
    name?: string;
    en_name?: string;
    mm_name?: string;
    slug: string;
  }>;
  const normalizedProductItems = productItems as ProductItem[];
  const normalizedBlogItems = blogItems as Array<{
    id: string;
    title: string;
    excerpt: string;
    coverImage?: string | null;
  }>;

  const categories = normalizedCategoryItems.map((category) => ({
    id: category.id,
    name: category.name || category.en_name || category.mm_name || 'Category',
    slug: category.slug
  }));

  const initialProducts = normalizedProductItems
    .filter((item) => item.status === 'ACTIVE')
    .map(mapHomeProduct);

  const reviews = reviewItems.map((review) => {
    const item = review as {
      id: string;
      rating: number;
      comment?: string | null;
      orderItem?: { variant?: { productId?: string } };
    };

    return {
      id: item.id,
      rating: item.rating,
      comment: item.comment?.trim() || 'Great product and smooth order flow.',
      productId: item.orderItem?.variant?.productId
    };
  });

  const blogs: HomeBlog[] = normalizedBlogItems.map((post) => ({
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
  }));

  return {
    categories,
    initialProducts,
    reviews,
    blogs,
    failed: categoryRes.status === 'rejected' && productRes.status === 'rejected'
  };
}

export default async function HomePage({ params: { locale } }: HomePageProps) {
  const cookieStore = cookies();
  const role = cookieStore.get(AUTH_ROLE_COOKIE)?.value;
  const preferredCurrency = normalizeCurrencyCode(
    cookieStore.get(CURRENCY_PREFERENCE_COOKIE)?.value
  );
  const isAuthed = role === 'CUSTOMER' || role === 'VENDOR' || role === 'ADMIN';

  const { categories, initialProducts, reviews, blogs, failed } = await loadHomeData(locale);
  const categoryItems = categories.slice(0, 14);
  const featuredProducts = initialProducts.slice(0, 24);
  const displayReviews = [...reviews, ...FALLBACK_REVIEW_ITEMS].slice(0, 10);
  const displayBlogs: HomeBlog[] = [...blogs, ...BLOG_FALLBACK_ITEMS].slice(0, 10);
  const reviewSlides = chunkArray(displayReviews, 3);
  const blogSlides = chunkArray(displayBlogs, 3);
  const productById = new Map(initialProducts.map((product) => [product.id, product]));

  const firstProductByCategory = new Map<string, HomeProduct>();
  for (const product of initialProducts) {
    if (!firstProductByCategory.has(product.categoryId)) {
      firstProductByCategory.set(product.categoryId, product);
    }
  }

  const collectionCards = categoryItems.slice(0, 6).map((category) => {
    const cover = firstProductByCategory.get(category.id);
    return {
      id: category.id,
      name: category.name,
      imageUrl: cover?.imageUrl ?? null
    };
  });

  return (
    <section className="space-y-8">
      <HeroSlider slides={HERO_SLIDES} />

      <div className="surface grid gap-3 p-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#dbe2ff] bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-[#5d6486]">Products</p>
          <p className="mt-1 text-xl font-semibold text-[#1b2452]">{initialProducts.length}</p>
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

      <div className="surface flex flex-wrap gap-2 p-4">
        {SECTION_LINKS.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="rounded-full border border-[#d9e2ff] bg-white px-3 py-1.5 text-sm text-[#2a3155] hover:border-[#9cb4ff] hover:bg-[#f5f8ff]"
          >
            {link.label}
          </a>
        ))}
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
      </section>

      <HomeCatalogSection
        categories={categoryItems}
        initialCurrency={preferredCurrency}
        initialProducts={featuredProducts}
        locale={locale}
      />

      <section id="deals" className="surface space-y-4 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#181f46]">Featured Deals</h2>
          <p className="text-sm text-[#60709b]">Campaign blocks with curated marketplace promotions.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="relative overflow-hidden rounded-3xl border border-[#2c3e8f] bg-gradient-to-br from-[#201b5c] via-[#2a2f9b] to-[#1371d6] p-7 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Best Offers</p>
            <h3 className="mt-2 text-3xl font-semibold">Digital Flash Sale</h3>
            <p className="mt-2 text-sm text-white/85">Limited deals on fast moving products and bundles.</p>
            <button className="mt-5 rounded-full border border-white/70 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur" type="button">
              Shop now
            </button>
          </article>
          <article className="relative overflow-hidden rounded-3xl border border-[#0f6f77] bg-gradient-to-br from-[#17578d] via-[#1f8f9d] to-[#46c69c] p-7 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Massive Savings</p>
            <h3 className="mt-2 text-3xl font-semibold">Home Appliances Deal</h3>
            <p className="mt-2 text-sm text-white/85">Power-efficient picks for a cleaner and smarter home.</p>
            <button className="mt-5 rounded-full border border-white/70 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur" type="button">
              Explore deals
            </button>
          </article>
        </div>
      </section>

      <section className="surface grid gap-4 p-5 md:grid-cols-4">
        {SERVICE_FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-[#e3e9ff] bg-[#fbfcff] p-4">
            <h3 className="text-sm font-semibold text-[#1c2453]">{feature.title}</h3>
            <p className="mt-1 text-xs text-[#60709b]">{feature.text}</p>
          </div>
        ))}
      </section>

      <section className="surface space-y-4 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#181f46]">Top Brands</h2>
          <p className="text-sm text-[#60709b]">Trusted partners in our catalog.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="rounded-full border border-[#dbe2ff] bg-white px-5 py-2 text-sm font-semibold text-[#34417d]"
            >
              {brand}
            </span>
          ))}
        </div>
      </section>

      <section id="reviews" className="surface space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#171d44]">Happy Clients</h2>
          <p className="text-sm text-[#5d6486]">We constantly work to make sure they&apos;re happy!</p>
        </div>
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
                    <h3 className="mt-4 text-[34px] font-semibold leading-none text-[#1d2247]">“</h3>
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
      </section>

      <section className="surface space-y-4 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#181f46]">Latest From Our Blog</h2>
          <p className="text-sm text-[#60709b]">Guides and shopping tips for better choices.</p>
        </div>
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
      </section>

      <section id="contact" className="surface grid gap-4 p-6 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[#181f46]">Contact</h2>
          <p className="text-sm text-[#5d6486]">Need help with products, orders, or returns? Send us a message.</p>
          <p className="text-sm text-[#2f3a74]">Email: support@eco.local</p>
          <p className="text-sm text-[#2f3a74]">Phone: +95 9 000 000 000</p>
        </div>
        <ContactForm />
      </section>

      {failed || (categoryItems.length === 0 && initialProducts.length === 0) ? (
        <div className="surface p-4 text-sm text-[#5d6486]">
          API data is unavailable. Please check backend server and refresh.
        </div>
      ) : null}
    </section>
  );
}
