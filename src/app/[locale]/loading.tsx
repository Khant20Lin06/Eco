export default function LocaleLoading() {
  return (
    <section className="space-y-4">
      <div className="surface animate-pulse p-6">
        <div className="h-8 w-48 rounded bg-[#e5ebff]" />
        <div className="mt-4 h-4 w-3/4 rounded bg-[#eef2ff]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`loading-card-${index + 1}`} className="surface animate-pulse p-4">
            <div className="h-40 rounded-xl bg-[#e8eeff]" />
            <div className="mt-4 h-4 w-2/3 rounded bg-[#e2e9ff]" />
            <div className="mt-2 h-3 w-full rounded bg-[#edf1ff]" />
            <div className="mt-2 h-3 w-5/6 rounded bg-[#edf1ff]" />
          </div>
        ))}
      </div>
    </section>
  );
}

