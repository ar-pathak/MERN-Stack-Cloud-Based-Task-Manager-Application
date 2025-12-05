
import { motion } from 'framer-motion'

export default function WaterEffect() {
    return (
        <svg
            className="absolute inset-x-0 bottom-0 w-full pointer-events-none opacity-20"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
        >
            <motion.path
                initial={{ d: 'M0,256L48,234.7C96,213,192,171,288,165.3C384,160,480,192,576,186.7C672,181,768,139,864,138.7C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z' }}
                animate={{ d: 'M0,288L48,266.7C96,245,192,203,288,186.7C384,171,480,181,576,170.7C672,160,768,128,864,128C960,128,1056,160,1152,154.7C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z' }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 8, ease: 'easeInOut' }}
                fill="url(#grad)"
            />
            <defs>
                <linearGradient id="grad" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
            </defs>
        </svg>
    )
}