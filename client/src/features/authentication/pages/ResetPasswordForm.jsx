import { useState } from "react";
import { useParams } from "react-router";
import { GhostButton, PrimaryButton } from "../components/Buttons";
import TextInput from "../components/TextInput";
import { views } from "../utils/view";

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

function ResetPasswordForm({ onSwitch, onSubmit, loading }) {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    if (!password || !confirm) {
      setError("Both fields are required.");
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError(
        "Password must be 8+ chars with uppercase, lowercase, number, and special character."
      );
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    onSubmit({ password, token });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-50 sm:text-lg">
          Set new password
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Choose a strong password you don&apos;t use elsewhere.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[0.75rem] text-rose-300">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <TextInput
          label="New password"
          type="password"
          name="password"
          value={password}
          placeholder="8+ chars, mixed types"
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
