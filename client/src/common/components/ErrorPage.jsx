import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";

const ErrorPage = ({ code = 404, message = "Page not found" }) => {
    const navigate = useNavigate();

    const isServerError = String(code).startsWith("5");

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 overflow-hidden">
            {/* Floating gradient circles */}
            <motion.div
                className="absolute -top-32 left-10 h-64 w-64 rounded-full bg-red-500/25 blur-3xl"
                animate={{ y: [0, 20, -10, 0], x: [0, -10, 10, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl"
                animate={{ y: [0, -25, 10, 0], x: [0, 20, -20, 0] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Card */}
            <motion.div
                className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl px-8 py-10 shadow-2xl"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
            >
                {/* Error code with subtle bounce */}
                <motion.div
                    className="flex justify-center mb-6"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 16 }}
                >
                    <motion.span
                        className="text-7xl font-black tracking-tight bg-gradient-to-br from-red-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(248,113,113,0.4)]"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                    >
                        {code}
                    </motion.span>
                </motion.div>

                {/* Title & message */}
                <motion.div
                    className="text-center space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="text-2xl font-semibold">
                        {isServerError ? "Something went wrong" : "Oops, that page is lost"}
                    </h1>
                    <p className="text-sm text-slate-300 max-w-md mx-auto">
                        {isServerError
                            ? "We hit an unexpected issue while processing your request. Our team has been notified (or at least, your logs have)."
                            : message ||
                            "The page you’re looking for doesn’t exist, was moved, or might be hiding in another universe."}
                    </p>
                </motion.div>

                {/* Animated info row */}
                <motion.div
                    className="mt-4 flex flex-col items-center gap-1 text-xs text-slate-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <span>Status code: {code}</span>
                    <motion.span
                        className="flex gap-1 items-center"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 1.6 }}
                    >
                        <span className="h-1 w-1 rounded-full bg-red-400" />
                        <span className="h-1 w-1 rounded-full bg-amber-300" />
                        <span className="h-1 w-1 rounded-full bg-emerald-300" />
                    </motion.span>
                </motion.div>

                {/* Buttons */}
                <motion.div
                    className="mt-8 flex flex-wrap justify-center gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <button
                        onClick={() => navigate("/")}
                        className="px-5 py-2.5 rounded-full text-sm font-medium bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 text-slate-950 shadow-lg shadow-red-500/30 hover:shadow-red-400/50 hover:-translate-y-0.5 transition-transform"
                    >
                        Go to Dashboard
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 rounded-full text-sm font-medium border border-slate-600/80 bg-slate-900/60 hover:bg-slate-800/80 transition-colors"
                    >
                        Try again
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default ErrorPage;
