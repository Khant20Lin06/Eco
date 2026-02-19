'use client';

import { Children, ReactNode, useEffect, useMemo, useState } from 'react';

type DotCarouselProps = {
  children: ReactNode;
  intervalMs?: number;
  className?: string;
};

export default function DotCarousel({
  children,
  intervalMs = 0,
  className = ''
}: DotCarouselProps) {
  const slides = useMemo(() => Children.toArray(children).filter(Boolean), [children]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const slideCount = slides.length;
  const canLoop = slideCount > 1;
  const renderedSlides = canLoop ? [...slides, slides[0]] : slides;
  const dotIndex = slideCount > 0 ? activeIndex % slideCount : 0;

  useEffect(() => {
    if (!canLoop && activeIndex >= slideCount) {
      setActiveIndex(0);
      return;
    }
    if (canLoop && activeIndex > slideCount) {
      setActiveIndex(0);
    }
  }, [activeIndex, canLoop, slideCount]);

  useEffect(() => {
    if (!canLoop || intervalMs <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => current + 1);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [canLoop, intervalMs]);

  useEffect(() => {
    if (transitionEnabled) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      setTransitionEnabled(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [transitionEnabled]);

  function onTransitionEnd() {
    if (!canLoop) {
      return;
    }
    if (activeIndex !== slideCount) {
      return;
    }
    setTransitionEnabled(false);
    setActiveIndex(0);
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="overflow-hidden">
        <div
          className={`flex ${transitionEnabled ? 'transition-transform duration-500 ease-out' : ''}`}
          onTransitionEnd={onTransitionEnd}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {renderedSlides.map((slide, index) => (
            <div key={index} className="min-w-full">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                index === dotIndex
                  ? 'scale-110 bg-[#2e4fae] ring-4 ring-[#d8e2ff]'
                  : 'bg-[#b7c4f5] hover:bg-[#93a8ef]'
              }`}
              onClick={() => {
                setTransitionEnabled(true);
                setActiveIndex(index);
              }}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
