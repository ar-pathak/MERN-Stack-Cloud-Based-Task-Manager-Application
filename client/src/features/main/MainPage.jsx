import MainSidebar from "./components/sidebar/MainSidebar";
import MainHeader from "./components/header/MainHeader";
import AnimatedBackground from "./components/background/AnimatedBackground";
import { Outlet } from "react-router";

const MainPage = () => {
    return (
        <div className="flex h-screen overflow-hidden">
            <AnimatedBackground />
            <MainSidebar />

            <div className="flex flex-col flex-1">
                <MainHeader />

                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>

    );
};

export default MainPage;
