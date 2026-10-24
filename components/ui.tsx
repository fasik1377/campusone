"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { humanize } from "@/lib/roles";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
export { cx };

/* --------------------------------- Buttons --------------------------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "gold" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
};

const variants = {
  primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm",
  gold: "bg-gold-500 text-navy-900 hover:bg-gold-400 shadow-sm font-semibold",
  secondary: "bg-white text-navy-900 border border-slate-300 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  ghost: "text-navy-700 hover:bg-navy-50",
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variants[variant],
        className,
      )}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: ButtonProps["variant"]; size?: "sm" | "md"; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors whitespace-nowrap",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------- Forms ---------------------------------- */

export function Field({ label, hint, error, required, children, className }: { label: string; hint?: string; error?: string; required?: boolean; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium text-navy-900">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children(id)}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100 disabled:bg-slate-100";

export function Input({ label, hint, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint} required={props.required} className={className}>
      {(id) => <input id={id} {...props} className={inputClass} />}
    </Field>
  );
}

export function Textarea({ label, hint, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint} required={props.required} className={className}>
      {(id) => <textarea id={id} rows={3} {...props} className={inputClass} />}
    </Field>
  );
}

export type Option = { value: string; label: string };

export function Select({ label, hint, options, placeholder, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; options: Option[]; placeholder?: string }) {
  return (
    <Field label={label} hint={hint} required={props.required} className={className}>
      {(id) => (
        <select id={id} {...props} className={inputClass}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-navy-900 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-navy-900" />
      <span>
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

/* --------------------------------- Layout ---------------------------------- */

export function Card({ title, actions, children, className, padded = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          {title && <h2 className="text-base font-semibold text-navy-900">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-sm text-navy-500 hover:text-navy-900">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const tones: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-navy-50 text-navy-700 ring-navy-600/20",
  gold: "bg-gold-50 text-gold-700 ring-gold-600/30",
  gray: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const statusTone: Record<string, keyof typeof tones> = {
  active: "green", approved: "green", accepted: "green", paid: "green", completed: "green", published: "green", present: "green", graduated: "blue",
  pending: "amber", pending_setup: "amber", submitted: "amber", under_review: "amber", info_required: "amber", partial: "amber", in_progress: "amber", waitlisted: "amber", late: "amber", on_leave: "amber", returned: "amber", open: "gray",
  suspended: "red", rejected: "red", unpaid: "red", cancelled: "gray", archived: "gray", withdrawn: "gray", dropped: "gray", disabled: "red", absent: "red", excused: "blue",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone ?? "gray"])}>{children}</span>;
}

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  return <Badge tone={statusTone[status] ?? "gray"}>{humanize(status)}</Badge>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBox({ message, details }: { message?: string | null; details?: unknown }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
      {Array.isArray(details) && details.length > 0 && typeof details[0] === "string" && (
        <ul className="mt-2 list-disc pl-5">
          {(details as string[]).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Notice({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "amber" | "green" }) {
  const cls = { blue: "border-navy-100 bg-navy-50 text-navy-800", amber: "border-amber-200 bg-amber-50 text-amber-800", green: "border-emerald-200 bg-emerald-50 text-emerald-800" }[tone];
  return <div className={cx("rounded-lg border px-4 py-3 text-sm", cls)}>{children}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-500">∅</div>
      <p className="font-medium text-navy-900">{title}</p>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  );
}

/* ---------------------------------- Table ---------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Column<T = any> = { key: string; label: string; render?: (row: T) => ReactNode; className?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({ columns, rows, empty = "No records yet.", rowKey = (r: T) => r._id }: { columns: Column<T>[]; rows: T[]; empty?: string; rowKey?: (r: T) => string }) {
  if (!rows.length) return <Empty title={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx("px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500", c.className)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-slate-50/70">
              {columns.map((c) => (
                <td key={c.key} className={cx("px-4 py-2.5 align-top text-slate-700", c.className)}>
                  {c.render ? c.render(row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------- Modal ---------------------------------- */

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-900/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx("w-full rounded-xl bg-white shadow-xl", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** A modal that asks for a confirmation and, optionally, a written reason. */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; message: string; reason?: boolean; danger?: boolean; confirm: string; resolve: (v: string | null) => void } | null>(null);
  const [reason, setReason] = useState("");
  const ask = useCallback(
    (opts: { title: string; message: string; reason?: boolean; danger?: boolean; confirm?: string }) =>
      new Promise<string | null>((resolve) => {
        setReason("");
        setState({ ...opts, confirm: opts.confirm ?? "Confirm", resolve });
      }),
    [],
  );
  const close = (value: string | null) => {
    state?.resolve(value);
    setState(null);
  };
  const dialog = (
    <Modal
      open={!!state}
      onClose={() => close(null)}
      title={state?.title ?? ""}
      footer={
        <>
          <Button variant="secondary" onClick={() => close(null)}>
            Cancel
          </Button>
          <Button variant={state?.danger ? "danger" : "primary"} disabled={state?.reason && !reason.trim()} onClick={() => close(reason.trim() || "")}>
            {state?.confirm}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{state?.message}</p>
      {state?.reason && <Textarea className="mt-3" label="Reason / note" required value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />}
    </Modal>
  );
  return { ask, dialog };
}

/* ---------------------------------- Toast ---------------------------------- */

type Toast = { id: number; message: string; tone: "success" | "error" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastContext value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cx("pointer-events-auto rounded-lg px-4 py-3 text-sm shadow-lg", t.tone === "success" ? "bg-navy-900 text-white" : "bg-red-600 text-white")}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export const useToast = () => useContext(ToastContext);

/* ------------------------------- Stat & tabs -------------------------------- */

export function StatCard({ label, value, href, tone = "default" }: { label: string; value: ReactNode; href?: string; tone?: "default" | "warning" | "success" | "danger" }) {
  const accent = { default: "border-l-navy-500", warning: "border-l-amber-500", success: "border-l-emerald-500", danger: "border-l-red-500" }[tone];
  const body = (
    <div className={cx("h-full rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition", accent, href && "hover:shadow-md hover:border-slate-300")}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
      {href && <p className="mt-1 text-xs text-navy-500">View list →</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: { key: T; label: string }[]; active: T; onChange: (key: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            "whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            active === t.key ? "border-gold-500 text-navy-900" : "border-transparent text-slate-500 hover:text-navy-900",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputClass, "max-w-xs")} aria-label={placeholder} />;
}

export function DescriptionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
          <dd className="mt-0.5 text-sm text-navy-900">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
