import Link from 'next/link';
import { cookies } from 'next/headers';
import { AUTH_ROLE_COOKIE } from '../../lib/auth-shared';
import { CURRENCY_PREFERENCE_COOKIE, normalizeCurrencyCode } from '../../lib/preferences';
import ContactForm from '../../components/home/ContactForm';
import HeroSlider from '../../components/home/HeroSlider';
import HomeCatalogSection from '../../components/home/HomeCatalogSection';
import HomeReviewsBlogs from '../../components/home/HomeReviewsBlogs';
import HomeSummaryCollections from '../../components/home/HomeSummaryCollections';

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

const SERVICE_FEATURES = [
  { title: 'Worldwide Shipping', text: 'Secure delivery to US & Myanmar addresses.' },
  { title: 'Easy Returns', text: 'Return flow with clear status tracking.' },
  { title: 'Real-Time Support', text: 'Order updates, chat, and in-app alerts.' },
  { title: 'Secure Payments', text: 'Stripe + MMK providers for safe checkout.' },
];

const BRANDS = ['VOLTAS', 'SAMSUNG', 'APPLE', 'DELL', 'ASUS', 'PHILIPS', 'SONY'];

export default async function HomePage({ params: { locale } }: HomePageProps) {
  const cookieStore = cookies();
  const role = cookieStore.get(AUTH_ROLE_COOKIE)?.value;
  const preferredCurrency = normalizeCurrencyCode(
    cookieStore.get(CURRENCY_PREFERENCE_COOKIE)?.value
  );
  const isAuthed = role === 'CUSTOMER' || role === 'VENDOR' || role === 'ADMIN';

  return (
    <section className="space-y-8">
      <HeroSlider slides={HERO_SLIDES} />

      <HomeSummaryCollections isAuthed={isAuthed} locale={locale} />

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

      <HomeCatalogSection
        categories={[]}
        initialCurrency={preferredCurrency}
        initialProducts={[]}
        isAuthed={isAuthed}
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

      <HomeReviewsBlogs locale={locale} />

      <section id="contact" className="surface grid gap-4 p-6 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[#181f46]">Contact</h2>
          <p className="text-sm text-[#5d6486]">Need help with products, orders, or returns? Send us a message.</p>
          <p className="text-sm text-[#2f3a74]">Email: support@eco.local</p>
          <p className="text-sm text-[#2f3a74]">Phone: +95 9 000 000 000</p>
        </div>
        <ContactForm />
      </section>
    </section>
  );
}
