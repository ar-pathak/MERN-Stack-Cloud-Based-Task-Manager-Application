function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-6 pt-4 text-[11px] text-slate-400 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800/70 pt-4 text-center md:flex-row md:text-left">
        <p>© {new Date().getFullYear()} NimbusTask Cloud. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className="hover:text-cyan-300">Status</button>
          <button className="hover:text-cyan-300">Privacy</button>
          <button className="hover:text-cyan-300">Security</button>
          <button className="hover:text-cyan-300">Docs</button>
        </div>
      </div>
    </footer>
  );
}
export default Footer;