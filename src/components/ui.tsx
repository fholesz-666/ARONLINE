"use client";

import { useId, useState, type ReactNode } from "react";

export function Field({
  label,
  help,
  error,
  badge,
  children,
  htmlFor,
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string | null;
  badge?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
        {badge}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-[0.8125rem] font-medium text-bad" role="alert">
          {error}
        </p>
      ) : help ? (
        <p className="field-help">{help}</p>
      ) : null}
    </div>
  );
}

export function TextInput(props: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  help?: ReactNode;
  error?: string | null;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={props.label} help={props.help} error={props.error} badge={props.badge} htmlFor={id}>
      <input
        id={id}
        className="input"
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        required={props.required}
        disabled={props.disabled}
        maxLength={props.maxLength ?? 300}
        aria-invalid={props.error ? true : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

/** Číselný vstup s podporou desetinné čárky. Prázdné pole = null. */
export function NumberInput(props: {
  label: ReactNode;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  unit?: string;
  help?: ReactNode;
  error?: string | null;
  min?: number;
  max?: number;
  badge?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (props.value == null || Number.isNaN(props.value) ? "" : String(props.value).replace(".", ","));
  const parsed = text != null && text.trim() !== "" ? Number(text.replace(/\s/g, "").replace(",", ".")) : null;
  const localError = text != null && text.trim() !== "" && !Number.isFinite(parsed) ? "Zadejte číslo" : null;
  return (
    <Field label={props.label} help={props.help} error={localError ?? props.error} badge={props.badge} htmlFor={id}>
      <div className="flex items-stretch">
        <input
          id={id}
          className={`input ${props.unit ? "rounded-r-none" : ""}`}
          inputMode="decimal"
          value={shown}
          placeholder={props.placeholder}
          disabled={props.disabled}
          aria-invalid={localError || props.error ? true : undefined}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            if (t.trim() === "") props.onChange(null);
            else {
              const n = Number(t.replace(/\s/g, "").replace(",", "."));
              if (Number.isFinite(n)) props.onChange(n);
            }
          }}
          onBlur={() => setText(null)}
        />
        {props.unit && (
          <span className="flex items-center rounded-r-[3px] border border-l-0 border-line bg-paper px-2.5 text-sm text-muted">{props.unit}</span>
        )}
      </div>
    </Field>
  );
}

export function SelectInput<T extends string>(props: {
  label: ReactNode;
  value: T | null | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string; group?: string }[];
  help?: ReactNode;
  error?: string | null;
  badge?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const groups = Array.from(new Set(props.options.map((o) => o.group ?? "")));
  return (
    <Field label={props.label} help={props.help} error={props.error} badge={props.badge} htmlFor={id}>
      <select
        id={id}
        className="input"
        value={props.value ?? ""}
        disabled={props.disabled}
        aria-invalid={props.error ? true : undefined}
        onChange={(e) => props.onChange(e.target.value as T)}
      >
        {props.value == null && <option value="">{props.placeholder ?? "Vyberte…"}</option>}
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {props.options
                .filter((o) => o.group === g)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ) : (
            props.options
              .filter((o) => !o.group)
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
          ),
        )}
      </select>
    </Field>
  );
}

export function Checkbox({ label, checked, onChange, help }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; help?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-[#14213d]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div>
        <label htmlFor={id} className="text-[0.9375rem]">
          {label}
        </label>
        {help && <p className="field-help mt-0">{help}</p>}
      </div>
    </div>
  );
}

export function Notice({ tone = "info", children, title }: { tone?: "info" | "warning" | "error" | "ok"; children: ReactNode; title?: string }) {
  const cls = {
    info: "border-auto bg-auto-soft",
    warning: "border-signal bg-signal-soft",
    error: "border-bad bg-bad-soft",
    ok: "border-ok bg-ok-soft",
  }[tone];
  return (
    <div className={`border-l-4 px-3 py-2 text-sm ${cls}`} role={tone === "error" ? "alert" : undefined}>
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export type Origin = "auto" | "manual" | "preset" | "default";

export function OriginBadge({ origin, confirmed, source }: { origin: Origin; confirmed?: boolean; source?: string }) {
  const map: Record<Origin, [string, string]> = {
    auto: ["převzato", "bg-auto-soft text-auto"],
    preset: ["předvolba", "bg-signal-soft text-preset"],
    default: ["výchozí", "bg-line-soft text-ink-soft"],
    manual: ["ručně", "bg-line-soft text-ink"],
  };
  const [text, cls] = map[origin];
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.72rem] font-semibold ${cls}`} title={source}>
      {text}
      {origin !== "manual" && (confirmed ? <span aria-label="potvrzeno">✓</span> : <span className="font-normal">ověřit</span>)}
    </span>
  );
}

export function Spinner({ label = "Načítám…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden="true" />
      {label}
    </span>
  );
}
