type Props = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
  prefix?: string;
};

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  hint,
  error,
  prefix,
}: Props) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted"
      >
        {label}
      </label>
      <div className="flex items-center border border-hairline bg-graphite focus-within:border-brand">
        {prefix ? (
          <span className="border-r border-hairline py-3 pr-3 pl-3 font-mono text-sm text-muted" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          id={name}
          name={name}
          type={type}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          className="min-h-[50px] w-full bg-transparent px-3 font-body text-[15px] text-ink outline-none placeholder:text-faint"
        />
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="font-mono text-xs text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
