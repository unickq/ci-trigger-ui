import { useMemo, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export default function JsonEditor({ value, onChange, placeholder, rows = 4 }: Props) {
  const [touched, setTouched] = useState(false);

  const error = useMemo(() => {
    if (!value.trim()) return null;
    try {
      JSON.parse(value);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid JSON";
    }
  }, [value]);

  const isValid = !error;
  const showError = touched && !!error;

  function handleFormat() {
    try {
      onChange(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      /* invalid json */
    }
  }

  const borderColor =
    !touched || !value.trim() ? "border-atom-border" : isValid ? "border-atom-green" : "border-atom-red";

  return (
    <div className="space-y-1">
      <div className="relative">
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setTouched(true);
          }}
          onBlur={() => setTouched(true)}
          spellCheck={false}
          className={`w-full rounded-xl border ${borderColor} bg-atom-bg px-3 py-2 pr-16 text-xs font-mono text-atom-fg outline-none transition focus:border-atom-blue resize-none placeholder:text-atom-fg-muted`}
        />
        <button
          type="button"
          onClick={handleFormat}
          disabled={!!error}
          className="absolute right-2 top-2 rounded border border-atom-border bg-atom-surface px-2 py-1 text-xs text-atom-fg-muted transition hover:text-atom-fg disabled:opacity-30"
        >
          Format
        </button>
      </div>
      {showError && <p className="text-xs text-atom-red px-1">{error}</p>}
    </div>
  );
}
