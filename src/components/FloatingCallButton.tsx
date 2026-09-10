export default function FloatingCallButton() {
  return (
    <a
      href="tel:+15199335090"
      aria-label="Call Gray Jay Care at (519) 933-5090"
      className="fixed bottom-5 left-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#8f2de2] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(93,24,155,0.32)] transition hover:-translate-y-0.5 hover:bg-[#7721c5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8f2de2] sm:bottom-6 sm:left-6 sm:px-5"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3 4 5c0 8 7 15 15 15l2-3-5-3-2 2c-3-1-5-3-6-6l2-2-3-5Z" />
      </svg>
      <span>Call Us</span>
      <span className="hidden font-medium opacity-90 sm:inline">(519) 933-5090</span>
    </a>
  );
}
