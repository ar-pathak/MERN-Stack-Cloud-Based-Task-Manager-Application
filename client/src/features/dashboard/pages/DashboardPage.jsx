
import AnimatedBackground from "../components/AnimatedBackground";
import DashboardContent from "../components/DashboardContent";
import DashboardHeader from "../components/DashboardHeader";
import DashboardSidebar from "../components/DashboardSidebar";

const DashboardPage = () => {
    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
            {/* Animated cloudy gradient background */}
            <AnimatedBackground />

            {/* Glass overlay */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.22),transparent_60%)] mix-blend-screen" />

            {/* Content container */}
            <div className="relative z-10 flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1 flex flex-col">
                    <DashboardHeader />
                    <DashboardContent />
                </main>
            </div>
        </div>
    );
};

export default DashboardPage;