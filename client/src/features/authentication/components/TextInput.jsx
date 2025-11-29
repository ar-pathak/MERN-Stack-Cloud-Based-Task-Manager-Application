
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
        className="w-full rounded-xl bg-slate-900/70 border border-slate-700/70 px-3 py-2 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-400 transition-all"
      />
    </label>
  );
}
export default TextInput;