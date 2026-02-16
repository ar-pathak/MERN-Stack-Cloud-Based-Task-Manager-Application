import { useState } from "react";
import { GhostButton, PrimaryButton } from "../components/Buttons";
import TextInput from "../components/TextInput";
import { views } from "../utils/view";

function ForgotPasswordForm({ onSwitch, onSubmit, loading }) {
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required.");
      return;
    }

    onSubmit({ email });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-50 sm:text-lg">
          Reset your password
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter your account email and we&apos;ll send a secure reset link.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[0.75rem] text-rose-300">
          {error}
        </p>
      )}

      <TextInput
        label="Email"
        type="email"
        name="email"
        value={email}
        placeholder="you@example.com"
        autoComplete="email"
        onChange={setEmail}
      />

      <PrimaryButton type="submit" loading={loading}>
        Send reset link
      </PrimaryButton>

      <GhostButton type="button" onClick={() => onSwitch(views.LOGIN)}>
        Back to login
      </GhostButton>
    </form>
  );
}
export default ForgotPasswordForm;
