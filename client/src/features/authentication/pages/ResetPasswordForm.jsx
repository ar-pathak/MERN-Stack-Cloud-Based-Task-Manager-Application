import { useState } from "react";
import { GhostButton, PrimaryButton } from "../components/Buttons";
import TextInput from "../components/TextInput";
import { views } from "../utils/view";

function ResetPasswordForm({ onSwitch, onSubmit, loading }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirm) {
      setError("Both fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    // Token tum URL se nikaloge, for now dummy:
    const token = "dummy-reset-token";
    onSubmit({ password, token });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">
          Set new password
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Choose a strong password that you don&apos;t use elsewhere.
        </p>
      </div>

      {error && (
        <p className="text-[0.7rem] text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <TextInput
          label="New password"
          type="password"
          name="password"
          value={password}
          placeholder="Min. 6 characters"
          autoComplete="new-password"
          onChange={setPassword}
        />
        <TextInput
          label="Confirm password"
          type="password"
          name="confirmPassword"
          value={confirm}
          placeholder="Re-enter password"
          autoComplete="new-password"
          onChange={setConfirm}
        />
      </div>

      <PrimaryButton type="submit" loading={loading}>
        Update password
      </PrimaryButton>

      <GhostButton type="button" onClick={() => onSwitch(views.LOGIN)}>
        Back to login
      </GhostButton>
    </form>
  );
}

export default ResetPasswordForm;