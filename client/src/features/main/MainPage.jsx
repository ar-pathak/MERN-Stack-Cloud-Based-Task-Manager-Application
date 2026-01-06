import MainSidebar from "./components/sidebar/MainSidebar";
import MainHeader from "./components/header/MainHeader";

const MainPage = () => {
    return (
        <div className="flex h-screen overflow-hidden">
            <MainSidebar />

            <div className="flex flex-col flex-1">
                <MainHeader />

                <main className="flex-1 overflow-y-auto p-6">
                    {/* routes / content */}
                </main>
            </div>
        </div>
        
    );
};

export default MainPage;
