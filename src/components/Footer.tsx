export default function Footer() {
  return (
    <footer className="mx-auto mt-10 w-full max-w-[1400px] px-4 pb-8">
      <div className="overflow-hidden rounded-3xl border border-[#1f2a5b] bg-[#0e1634] text-[#d9e3ff] shadow-[0_14px_36px_rgba(7,12,33,0.35)]">
        <div className="grid gap-6 border-b border-[#243063] px-5 py-6 md:grid-cols-[1.2fr_1fr] md:px-8">
          <div>
            <h3 className="text-lg font-semibold text-white">Sign up to receive updates</h3>
            <p className="mt-1 text-sm text-[#b5c3ec]">Exclusive deals, new arrivals, and weekly highlights.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-full border border-[#314183] bg-[#121d46] px-4 py-2 text-sm text-white outline-none placeholder:text-[#8f9ec7] focus:border-[#6f8fff]"
              placeholder="Enter your email"
              type="email"
            />
            <button className="rounded-full bg-[#f4a93d] px-4 py-2 text-sm font-semibold text-[#192448]" type="button">
              Subscribe
            </button>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 text-sm md:grid-cols-4 md:px-8">
          <div className="space-y-2">
            <h4 className="font-semibold text-white">Eco Market</h4>
            <p className="text-[#b5c3ec]">Customer, Vendor, and Admin platform for sustainable commerce.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-white">Information</h4>
            <p className="text-[#b5c3ec]">About us</p>
            <p className="text-[#b5c3ec]">Contact us</p>
            <p className="text-[#b5c3ec]">Privacy policy</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-white">Customer Service</h4>
            <p className="text-[#b5c3ec]">Help center</p>
            <p className="text-[#b5c3ec]">Return policy</p>
            <p className="text-[#b5c3ec]">Shipping details</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-white">Contact</h4>
            <p className="text-[#b5c3ec]">support@eco.local</p>
            <p className="text-[#b5c3ec]">+95 9 000 000 000</p>
            <p className="text-[#b5c3ec]">Mon - Sun / 24h</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
