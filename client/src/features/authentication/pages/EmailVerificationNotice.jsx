import { MailCheck } from "lucide-react";
import { PrimaryButton } from "../components/Buttons";

function EmailVerificationNotice({ onBackToLogin }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/90 text-slate-950 shadow-lg shadow-emerald-500/40">
          <MailCheck className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-50 sm:text-lg">Verify your email</h2>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
            We sent a verification link to your inbox. Open it to activate your Aurora account.
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
