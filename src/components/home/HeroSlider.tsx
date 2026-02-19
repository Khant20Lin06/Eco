'use client';

import { useEffect, useMemo, useState } from 'react';

type Slide = {
  title: string;
  text: string;
  badge: string;
  color: string;
  cta?: string;
};

type HeroSliderProps = {
  slides: Slide[];
  intervalMs?: number;
};

export default function HeroSlider({ slides, intervalMs = 4500 }: HeroSliderProps) {
  const safeSlides = useMemo(() => slides.filter(Boolean), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const stars = useMemo(
    () => [
      { left: '4%', top: '8%', size: '6px' },
      { left: '11%', top: '34%', size: '4px' },
      { left: '22%', top: '16%', size: '5px' },
      { left: '29%', top: '52%', size: '4px' },
      { left: '41%', top: '11%', size: '5px' },
      { left: '48%', top: '38%', size: '4px' },
      { left: '55%', top: '24%', size: '5px' },
      { left: '62%', top: '67%', size: '4px' },
      { left: '75%', top: '19%', size: '5px' },
      { left: '83%', top: '42%', size: '4px' },
      { left: '92%', top: '26%', size: '6px' }
    ],
    []
  );

  useEffect(() => {
    if (safeSlides.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeSlides.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [safeSlides.length, intervalMs]);

  useEffect(() => {
    if (activeIndex >= safeSlides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, safeSlides.length]);

  if (safeSlides.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#cad8ff] bg-white p-2 shadow-[0_18px_34px_rgba(20,37,95,0.14)]">
      <div className="relative overflow-hidden rounded-[22px]">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {safeSlides.map((slide) => (
            <article
              key={slide.title}
              className={`relative min-w-full overflow-hidden rounded-[22px] bg-gradient-to-r ${slide.color} px-7 py-8 text-white md:px-10 md:py-10`}
            >
              {stars.map((star) => (
                <span
                  key={`${slide.title}-${star.left}-${star.top}`}
                  className="pointer-events-none absolute rounded-full bg-white/80"
                  style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
                />
              ))}

              <div className="relative grid items-center gap-8 md:grid-cols-[1fr_1.05fr]">
                <div>
                  <p className="inline-flex rounded-full bg-black/25 px-2 py-1 text-xs font-semibold backdrop-blur">
                    {slide.badge}
                  </p>
                  <h2 className="mt-4 text-4xl font-semibold leading-[1.05] md:text-6xl">{slide.title}</h2>
                  <p className="mt-4 max-w-sm text-base text-white/90 md:text-lg">{slide.text}</p>
                  <button className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#123a76]" type="button">
                    {slide.cta ?? 'Explore Now'}
                  </button>
                </div>

                <div className="relative mx-auto hidden h-[300px] w-[320px] md:block">
                  <div className="absolute right-0 top-1/2 h-[230px] w-[230px] -translate-y-1/2 rounded-full border-[24px] border-white/90 shadow-[0_20px_45px_rgba(0,0,0,0.25)]" />
                  <div className="absolute left-16 top-1/2 grid h-[170px] w-[170px] -translate-y-1/2 place-items-center rounded-[28px] bg-[#22d3c2]/90 shadow-[0_20px_42px_rgba(10,23,61,0.4)]">
                    <div className="h-16 w-16 rounded-full border-4 border-white/70" />
                  </div>
                  <div className="absolute left-4 top-10 h-12 w-12 rounded-full bg-[#2ff2c8]/35 backdrop-blur" />
                  <div className="absolute bottom-10 left-2 h-10 w-10 rounded-full bg-[#52f7d0]/30 backdrop-blur" />
                  <div className="absolute right-10 top-8 h-9 w-9 rounded-full bg-white/25 backdrop-blur" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 pb-1">
        {safeSlides.map((slide, index) => (
          <button
            key={slide.title}
            aria-label={`Go to slide ${index + 1}`}
            className={`h-2.5 rounded-full transition-all ${
              index === activeIndex ? 'w-8 bg-[#2e4fae]' : 'w-2.5 bg-[#b7c4f5]'
            }`}
            onClick={() => setActiveIndex(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
