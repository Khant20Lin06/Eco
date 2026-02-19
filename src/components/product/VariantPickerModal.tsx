'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductVariant } from '../../lib/api';

type VariantPickerModalProps = {
  open: boolean;
  title: string;
  variants: ProductVariant[];
  locale: string;
  onClose: () => void;
  onConfirm: (input: { variantId: string; qty: number }) => Promise<void> | void;
};

type VariantOptionGroup = {
  name: string;
  values: string[];
};

function formatMoney(amount: number, currency: string, locale: string) {
  const value = amount / (currency === 'USD' ? 100 : 1);
  const localeCode = locale === 'my' ? 'my-MM' : 'en-US';
  return new Intl.NumberFormat(localeCode, {
    style: 'currency',
    currency: currency === 'MMK' ? 'MMK' : 'USD',
    maximumFractionDigits: currency === 'MMK' ? 0 : 2
  }).format(value);
}

function buildOptionGroups(variants: ProductVariant[]): VariantOptionGroup[] {
  const map = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const option of variant.options ?? []) {
      if (!map.has(option.name)) {
        map.set(option.name, new Set<string>());
      }
      map.get(option.name)?.add(option.value);
    }
  }

  return Array.from(map.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values)
  }));
}

function variantMatches(
  variant: ProductVariant,
  selectedOptions: Record<string, string>,
  groups: VariantOptionGroup[]
) {
  if (groups.length === 0) {
    return true;
  }

  return groups.every((group) => {
    const selectedValue = selectedOptions[group.name];
    if (!selectedValue) {
      return false;
    }
    const option = (variant.options ?? []).find((item) => item.name === group.name);
    return option?.value === selectedValue;
  });
}

export default function VariantPickerModal({
  open,
  title,
  variants,
  locale,
  onClose,
  onConfirm
}: VariantPickerModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const optionGroups = useMemo(() => buildOptionGroups(variants), [variants]);
  const matchedVariant = useMemo(
    () =>
      variants.find((variant) =>
        variantMatches(variant, selectedOptions, optionGroups)
      ) ?? (optionGroups.length === 0 ? variants[0] : undefined),
    [optionGroups, selectedOptions, variants]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextOptions: Record<string, string> = {};
    const firstVariant = variants[0];

    for (const group of optionGroups) {
      const fromFirst =
        firstVariant?.options?.find((item) => item.name === group.name)?.value ??
        group.values[0];
      if (fromFirst) {
        nextOptions[group.name] = fromFirst;
      }
    }

    setSelectedOptions(nextOptions);
    setQty(1);
  }, [open, optionGroups, variants]);

  if (!open) {
    return null;
  }

  const maxQty = matchedVariant?.stockQty ?? 0;
  const disabledConfirm = !matchedVariant || maxQty <= 0 || qty < 1 || qty > maxQty || submitting;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[#dce3ff] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#1b2452]">Choose Variant</h3>
            <p className="mt-1 text-sm text-[#5d6486] line-clamp-1">{title}</p>
          </div>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d4dcff] text-[#4e5b8c]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {optionGroups.map((group) => (
            <div key={group.name}>
              <p className="text-sm font-semibold text-[#2d396d]">{group.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.values.map((value) => (
                  <button
                    key={`${group.name}-${value}`}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      selectedOptions[group.name] === value
                        ? 'border-[#3958c7] bg-[#3958c7] text-white'
                        : 'border-[#d4ddff] bg-white text-[#2e3a6c]'
                    }`}
                    onClick={() =>
                      setSelectedOptions((prev) => ({
                        ...prev,
                        [group.name]: value
                      }))
                    }
                    type="button"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="text-sm font-semibold text-[#2d396d]">
              Quantity
              <input
                className="mt-2 w-full rounded-xl border border-[#cad3ff] px-3 py-2 text-sm"
                min={1}
                max={maxQty > 0 ? maxQty : undefined}
                onChange={(event) => setQty(Number(event.target.value))}
                type="number"
                value={qty}
              />
            </label>
            <div className="rounded-xl border border-[#d7e0ff] bg-[#f8faff] px-4 py-3">
              <p className="text-xs text-[#60709e]">Price</p>
              <p className="text-base font-semibold text-[#18214f]">
                {matchedVariant
                  ? formatMoney(matchedVariant.price, matchedVariant.currency, locale)
                  : '-'}
              </p>
              <p className="mt-1 text-xs text-[#60709e]">Stock {matchedVariant?.stockQty ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-[#cad6ff] px-4 py-2 text-sm font-semibold text-[#3349ad]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#3654c5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={disabledConfirm}
            onClick={async () => {
              if (!matchedVariant || qty < 1) {
                return;
              }
              setSubmitting(true);
              try {
                await onConfirm({ variantId: matchedVariant.id, qty });
              } finally {
                setSubmitting(false);
              }
            }}
            type="button"
          >
            {submitting ? 'Adding...' : 'Add to bag'}
          </button>
        </div>
      </div>
    </div>
  );
}
