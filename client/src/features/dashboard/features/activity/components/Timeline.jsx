import ActivityItem from "./ActivityItem";

export default function Timeline({ items }) {
    return (
        <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 to-purple-300 rounded" />
            <ul className="flex flex-col gap-4">
                {items.map((act, i) => (
                    <ActivityItem key={act.id} activity={act} index={i} />
                ))}
            </ul>
        </div>
    )
}