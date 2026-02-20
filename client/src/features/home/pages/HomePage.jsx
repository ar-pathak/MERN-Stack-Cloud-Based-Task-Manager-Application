import { lazy, Suspense } from "react";
import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";

const FeaturesSection = lazy(() => import("../components/FeaturesSection"));
const FlowSection = lazy(() => import("../components/FlowSection"));
const UseCasesSection = lazy(() => import("../components/UseCasesSection"));
const SecuritySection = lazy(() => import("../components/SecuritySection"));
const Footer = lazy(() => import("../components/Footer"));

const HomePage = () => (
  <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-50">
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -bottom-44 -right-40 h-[24rem] w-[24rem] rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute inset-x-0 top-32 mx-auto h-72 w-[24rem] rounded-[999px] bg-sky-400/10 blur-3xl sm:w-[38rem]" />
    </div>

    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <HeroSection />

        <Suspense fallback={null}>
          <FeaturesSection />
        </Suspense>
        <Suspense fallback={null}>
          <FlowSection />
        </Suspense>
        <Suspense fallback={null}>
          <UseCasesSection />
        </Suspense>
        <Suspense fallback={null}>
          <SecuritySection />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  </div>
);

export default HomePage;
