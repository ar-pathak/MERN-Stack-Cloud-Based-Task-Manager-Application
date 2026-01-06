import { motion } from "framer-motion";
import { HeaderLeft } from "./HeaderLeft";
import { HeaderCenter } from "./HeaderCenter";
import { HeaderRight } from "./HeaderRight";

const MainHeader = () => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 h-16 w-full border-b border-slate-800/70 
                 bg-slate-950/60 backdrop-blur-xl"
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <HeaderLeft />
        <HeaderCenter />
        <HeaderRight />
      </div>
    </motion.header>
  );
};

export default MainHeader;
