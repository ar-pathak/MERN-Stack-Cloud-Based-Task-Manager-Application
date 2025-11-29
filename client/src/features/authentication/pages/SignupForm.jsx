import { useState } from "react";
import TextInput from "../components/TextInput";
import { PrimaryButton } from "../components/Buttons";
import SocialAuthSection from "../components/SocialAuthSection";
import { views } from "../utils/view";

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
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
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
        <h2 className="text-lg font-semibold text-slate-50">
          Create your account ✨
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Sign up and start using your dashboard within minutes.
        </p>
      </div>

      {error && (
        <p className="text-[0.7rem] text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <TextInput
          label="Full name"
          name="name"
          value={name}
          placeholder="Arsan Pathak"
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

      <p className="text-[0.67rem] text-slate-400">
        By signing up, you agree to our{" "}
        <span className="text-indigo-300">Terms</span> and{" "}
        <span className="text-indigo-300">Privacy Policy</span>.
      </p>

      <PrimaryButton type="submit" loading={loading}>
        Create account
      </PrimaryButton>

      <SocialAuthSection />

      <p className="text-[0.7rem] text-slate-400 text-center">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitch(views.LOGIN)}
          className="text-indigo-300 hover:text-indigo-200 font-medium"
        >
          Log in
        </button>
      </p>
    </form>
  );
}
export default SignupForm;