import { useState } from "react";
import { PrimaryButton } from "../components/Buttons";
import SocialAuthSection from "../components/SocialAuthSection";
import TextInput from "../components/TextInput";
import { views } from "../utils/view";

function LoginForm({ onSwitch, onSubmit, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    onSubmit({ email, password, remember });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">
          Welcome back 👋
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Log in to your account to continue.
        </p>
      </div>

      {error && (
        <p className="text-[0.7rem] text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-3">
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
          placeholder="••••••••"
          autoComplete="current-password"
          onChange={setPassword}
        />
      </div>

      <div className="flex items-center justify-between text-[0.7rem] text-slate-300/90">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded border-slate-600/80 bg-slate-900 text-indigo-500 focus:ring-indigo-500/70 focus:ring-offset-0"
          />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          onClick={() => onSwitch(views.FORGOT)}
          className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2"
        >
          Forgot password?
        </button>
      </div>

      <PrimaryButton type="submit" loading={loading}>
        Log in
      </PrimaryButton>

      <SocialAuthSection />

      <p className="text-[0.7rem] text-slate-400 text-center">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitch(views.SIGNUP)}
          className="text-indigo-300 hover:text-indigo-200 font-medium"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
export default LoginForm;