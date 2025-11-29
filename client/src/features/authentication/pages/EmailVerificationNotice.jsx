import { PrimaryButton } from "../components/Buttons";
import { motion, AnimatePresence } from "framer-motion";

function EmailVerificationNotice({ onBackToLogin }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center gap-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="w-14 h-14 rounded-2xl bg-emerald-400/90 text-slate-950 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/40"
        >
          ✉️
        </motion.div>
        <div>
          <h2 className="text-lg font-semibold text-slate-50">
            Verify your email
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            We&apos;ve sent a verification link to your email. Click the link to
            activate your account. You can close this window after verification.
          </p>
        </div>
      </div>

      <PrimaryButton type="button" onClick={onBackToLogin}>
        Back to login
      </PrimaryButton>
    </div>
  );
}

export default EmailVerificationNotice;