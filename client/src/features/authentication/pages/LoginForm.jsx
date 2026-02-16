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
        <h2 className="text-base font-semibold text-slate-50 sm:text-lg">Welcome back</h2>
        <p className="mt-1 text-xs text-slate-400">
          Log in to open your Aurora workspace and continue your flow.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[0.75rem] text-rose-300">
          {error}
        </p>
      ) : null}

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
          placeholder="Enter your password"
          autoComplete="current-password"
          onChange={setPassword}
        />
      </div>

      <div className="flex flex-col gap-2 text-[0.72rem] text-slate-300/90 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded border-slate-600/80 bg-slate-900 text-sky-500 focus:ring-sky-500/60 focus:ring-offset-0"
          />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          onClick={() => onSwitch(views.FORGOT)}
          className="text-left text-sky-300 underline underline-offset-2 transition-colors hover:text-sky-200 min-[380px]:text-right"
        >
          Forgot password?
        </button>
      </div>

      <PrimaryButton type="submit" loading={loading}>
        Log in
      </PrimaryButton>

      <SocialAuthSection />

      <p className="text-center text-[0.72rem] text-slate-400">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitch(views.SIGNUP)}
          className="font-medium text-sky-300 transition-colors hover:text-sky-200"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}

export default LoginForm;
