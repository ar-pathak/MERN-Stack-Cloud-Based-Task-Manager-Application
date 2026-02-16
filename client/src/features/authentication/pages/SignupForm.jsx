import { useState } from "react";
import TextInput from "../components/TextInput";
import { PrimaryButton } from "../components/Buttons";
import SocialAuthSection from "../components/SocialAuthSection";
import { views } from "../utils/view";

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

function SignupForm({ onSwitch, onSubmit, loading }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirm) {
      setError("All fields are required.");
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

    onSubmit({ name, email, password });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-50 sm:text-lg">Create your Aurora account</h2>
        <p className="mt-1 text-xs text-slate-400">
          Set up your profile and start collaborating in Aurora Workspace.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[0.75rem] text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <TextInput
          label="Full name"
          name="name"
          value={name}
          placeholder="Your name"
          autoComplete="name"
          onChange={setName}
        />
        <TextInput
          label="Email"
          type="email"
          name="email"
          value={email}
          placeholder="you@example.com"
          autoComplete="email"
          onChange={setEmail}
        />
        <TextInput
          label="Password"
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

      <p className="text-[0.7rem] leading-relaxed text-slate-400">
        By signing up, you agree to Aurora&apos;s Terms and Privacy Policy.
      </p>

      <PrimaryButton type="submit" loading={loading}>
        Create account
      </PrimaryButton>

      <SocialAuthSection />

      <p className="text-center text-[0.72rem] text-slate-400">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitch(views.LOGIN)}
          className="font-medium text-sky-300 transition-colors hover:text-sky-200"
        >
          Log in
        </button>
      </p>
    </form>
  );
}

export default SignupForm;
