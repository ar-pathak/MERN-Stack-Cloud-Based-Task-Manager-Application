import ActivityTimeline from "./ActivityTimeline";
import CloudWorkspace from "./CloudWorkspace";
import StatsRow from "./StatsRow";
import TaskColumns from "./TaskColumns";

const DashboardContent = () => {
    return (
        <div className="flex-1 px-4 py-4 md:px-6 md:py-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
                <div className="space-y-4">
                    <StatsRow />
                    <TaskColumns />
                </div>
                <div className="space-y-4">
                    <CloudWorkspace />
                    <ActivityTimeline />
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;