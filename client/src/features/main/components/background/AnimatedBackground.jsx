import { motion } from "framer-motion";

const AnimatedBackground = () => {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden">
            {/* soft gradient base */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950" />

            {/* floating blobs (like clouds / water light) */}
            <motion.div
                className="absolute -top-40 -left-32 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl"
                animate={{ x: [0, 40, -20, 0], y: [0, 30, 10, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"
                animate={{ x: [0, -30, 10, 0], y: [0, -20, 20, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-blue-500/16 blur-3xl"
                animate={{ x: [0, 10, -10, 0], y: [0, 20, -10, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* subtle noise layer */}
            <div className="absolute inset-0 opacity-[0.12] mix-blend-soft-light [background-image:url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
};

export default AnimatedBackground;