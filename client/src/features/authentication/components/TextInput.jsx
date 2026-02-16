
function TextInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-slate-200/90">
      <span className="flex items-center justify-between">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all focus:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
      />
    </label>
  );
}
export default TextInput;
