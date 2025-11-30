
import { motion } from "framer-motion";
import { lazy, Suspense } from "react";
import LazyLoader from "../../../common/components/LazyLoader";

const Navbar = lazy(() => import("../components/Navbar"));
const HeroSection = lazy(() => import("../components/HeroSection"))
const FeaturesSection = lazy(() => import("../components/FeaturesSection"))
const TrustBar = lazy(() => import("../components/TrustBar"))
const FlowSection = lazy(() => import("../components/FlowSection"))
const UseCasesSection = lazy(() => import("../components/UseCasesSection"))
const SecuritySection = lazy(() => import("../components/SecuritySection"))
const CTASection = lazy(() => import("../components/CTASection"))
const Footer = lazy(() => import("../components/Footer"))

const HomePage = () => {
    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">

            {/* Water / fluid gradient background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div
                    className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-cyan-500/30 blur-3xl"
                    animate={{ x: [0, 40, -20, 0], y: [0, 30, 10, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -bottom-40 -right-40 h-[22rem] w-[22rem] rounded-full bg-blue-500/25 blur-3xl"
                    animate={{ x: [0, -30, 10, 0], y: [0, -20, 30, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute inset-x-0 top-40 mx-auto h-64 w-[36rem] rounded-[999px] bg-cyan-400/20 blur-3xl"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            {/* Page content */}
            <div className="relative z-10 flex min-h-screen flex-col">
                <Suspense fallback={<LazyLoader />}>
                    <Navbar />
                </Suspense>

                <main className="flex-1">
                    <Suspense fallback={<LazyLoader />}>
                        <HeroSection />
                    </Suspense>
                    <Suspense fallback={<LazyLoader />}>
                        <TrustBar />
                    </Suspense>
                    <Suspense fallback={<LazyLoader />}>
                        <FeaturesSection />
                    </Suspense>
                    <Suspense fallback={<LazyLoader />}>
                        <FlowSection />
                    </Suspense>
                    <Suspense fallback={<LazyLoader />}>
                        <UseCasesSection />
                    </Suspense>
                    <Suspense fallback={<LazyLoader />}>
                        <SecuritySection />
                    </Suspense>
                    <Suspense fallback={<LazyLoader />}>
                        <CTASection />
                    </Suspense>
                </main>
                <Suspense fallback={<LazyLoader />}>
                    <Footer />
                </Suspense>
            </div>
        </div>
    );
};

export default HomePage;