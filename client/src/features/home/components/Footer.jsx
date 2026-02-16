import { Link } from "react-router";

function Footer() {
    return (
        <footer className="mx-auto w-full max-w-7xl px-3 pb-8 pt-4 text-xs text-slate-400 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 px-3 py-4 backdrop-blur sm:px-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-100">Aurora</p>
                        <p className="mt-1 text-xs text-slate-400 break-words">
                            Workspace, Flow, Connect, and Insights in one platform.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <Link to="/main/support" className="transition-colors hover:text-cyan-300">
                            Help
                        </Link>
                        <Link to="/main/support" className="transition-colors hover:text-cyan-300">
                            Support
                        </Link>
                        <Link to="/main/support" className="transition-colors hover:text-cyan-300">
                            Docs
                        </Link>
                        <a href="mailto:support@aurora-app.com" className="transition-colors hover:text-cyan-300">
                            Contact
                        </a>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex flex-col gap-1 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p className="break-words">{`Copyright ${new Date().getFullYear()} Aurora. All rights reserved.`}</p>
                <p className="break-words">Built for modern collaborative workspaces.</p>
            </div>
        </footer>
    );
}

export default Footer;
