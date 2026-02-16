
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import LazyLoader from "../../../common/components/LazyLoader";

const Navbar = lazy(() => import("../components/Navbar"));
const HeroSection = lazy(() => import("../components/HeroSection"));
const FeaturesSection = lazy(() => import("../components/FeaturesSection"));
const FlowSection = lazy(() => import("../components/FlowSection"));
const UseCasesSection = lazy(() => import("../components/UseCasesSection"));
const SecuritySection = lazy(() => import("../components/SecuritySection"));
const Footer = lazy(() => import("../components/Footer"));

const HomePage = () => (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-hidden bg-slate-950 text-slate-50">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
                className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-cyan-500/25 blur-3xl"
                animate={{ x: [0, 36, -24, 0], y: [0, 28, 10, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute -bottom-40 -right-40 h-[24rem] w-[24rem] rounded-full bg-blue-500/25 blur-3xl"
                animate={{ x: [0, -24, 12, 0], y: [0, -14, 26, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute inset-x-0 top-32 mx-auto h-72 w-[24rem] rounded-[999px] bg-sky-400/15 blur-3xl sm:w-[38rem]"
                animate={{ opacity: [0.24, 0.58, 0.24] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
            <Suspense fallback={<LazyLoader />}>
                <Navbar />
            </Suspense>

            <main className="flex-1">
                <Suspense fallback={<LazyLoader />}>
                    <HeroSection />
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
            </main>

            <Suspense fallback={<LazyLoader />}>
                <Footer />
            </Suspense>
        </div>
    </div>
);

export default HomePage;
