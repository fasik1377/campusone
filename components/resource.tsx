"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, useApi } from "@/lib/client";
import {
  Button,
  Card,
  Checkbox,
  cx,
  DataTable,
  ErrorBox,
  Input,
  Loading,
  Modal,
  SearchBox,
  Select,
  Textarea,
  useConfirm,
  useToast,
  type Column,
  type Option,
} from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Values = Record<string, any>;

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "password" | "date" | "textarea" | "select" | "checkbox" | "multiselect" | "custom";
  options?: Option[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  full?: boolean;
  step?: string;
  render?: (value: any, set: (v: any) => void, values: Values) => ReactNode;
};

export function FormFields({ fields, values, onChange }: { fields: FieldDef[]; values: Values; onChange: (name: string, value: any) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const value = values[f.name];
        const set = (v: any) => onChange(f.name, v);
        const wrap = cx(f.full || f.type === "textarea" || f.type === "multiselect" || f.type === "custom" ? "sm:col-span-2" : "");
        switch (f.type) {
          case "textarea":
            return <Textarea key={f.name} className={wrap} label={f.label} hint={f.hint} required={f.required} value={value ?? ""} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />;
          case "select":
            return <Select key={f.name} className={wrap} label={f.label} hint={f.hint} required={f.required} value={value ?? ""} onChange={(e) => set(e.target.value)} options={f.options ?? []} placeholder={f.placeholder ?? "Select…"} />;
          case "checkbox":
            return (
              <div key={f.name} className={cx(wrap, "flex items-end pb-2")}>
                <Checkbox label={f.label} hint={f.hint} checked={!!value} onChange={set} />
              </div>
            );
          case "multiselect": {
            const selected: string[] = value ?? [];
            return (
              <fieldset key={f.name} className={wrap}>
                <legend className="mb-1 text-sm font-medium text-navy-900">{f.label}</legend>
                <div className="grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                  {(f.options ?? []).length === 0 && <p className="text-xs text-slate-500">No options available.</p>}
                  {(f.options ?? []).map((o) => (
                    <Checkbox key={o.value} label={o.label} checked={selected.includes(o.value)} onChange={(on) => set(on ? [...selected, o.value] : selected.filter((s) => s !== o.value))} />
                  ))}
                </div>
                {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
              </fieldset>
            );
          }
          case "custom":
            return (
              <div key={f.name} className={wrap}>
                {f.render?.(value, set, values)}
              </div>
            );
          default:
            return (
              <Input
                key={f.name}
                className={wrap}
                label={f.label}
                hint={f.hint}
                required={f.required}
                type={f.type ?? "text"}
                step={f.step}
                placeholder={f.placeholder}
                value={value ?? ""}
                onChange={(e) => set(e.target.value)}
              />
            );
        }
      })}
    </div>
  );
}

/** Form in a modal that submits to the API and reports errors inline. */
export function FormModal({
  open,
  onClose,
  title,
  fields,
  initial,
  submit,
  submitLabel = "Save",
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldDef[];
  initial: Values;
  submit: (values: Values) => Promise<void>;
  submitLabel?: string;
  wide?: boolean;
  children?: ReactNode;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await submit(values);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide={wide ?? fields.length > 6}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="resource-form" loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="resource-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <ErrorBox message={error} />
        {children}
        <FormFields fields={fields} values={values} onChange={(name, v) => setValues((s) => ({ ...s, [name]: v }))} />
      </form>
    </Modal>
  );
}

/** List + search + create / edit / delete for a tenant-scoped API collection. */
export function ResourceManager({
  endpoint,
  entity,
  columns,
  fields,
  defaults = {},
  toForm = (item) => item,
  toBody = (values) => values,
  canWrite,
  canDelete = canWrite,
  query = "",
  rowActions,
  headerActions,
  searchKeys,
  title,
}: {
  endpoint: string;
  entity: string;
  columns: Column[];
  fields: FieldDef[];
  defaults?: Values;
  toForm?: (item: any) => Values;
  toBody?: (values: Values) => Values;
  canWrite: boolean;
  canDelete?: boolean;
  query?: string;
  rowActions?: (row: any, reload: () => void) => ReactNode;
  headerActions?: ReactNode;
  searchKeys?: string[];
  title?: string;
}) {
  const { data, error, loading, reload } = useApi<{ items: any[] }>(`${endpoint}${query ? `?${query}` : ""}`);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (!q.trim()) return items;
    const needle = q.toLowerCase();
    const keys = searchKeys ?? columns.map((c) => c.key);
    return items.filter((r) => keys.some((k) => String(k.split(".").reduce((o: any, p) => o?.[p], r) ?? "").toLowerCase().includes(needle)));
  }, [data, q, columns, searchKeys]);

  async function remove(row: any) {
    const ok = await ask({ title: `Delete ${entity.toLowerCase()}?`, message: "This cannot be undone.", danger: true, confirm: "Delete" });
    if (ok === null) return;
    try {
      await api(`${endpoint}/${row._id}`, { method: "DELETE" });
      toast(`${entity} deleted`);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const allColumns: Column[] = [
    ...columns,
    ...(canWrite || rowActions
      ? [
          {
            key: "_actions",
            label: "",
            className: "text-right whitespace-nowrap",
            render: (row: any) => (
              <div className="flex justify-end gap-1">
                {rowActions?.(row, reload)}
                {canWrite && (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => remove(row)}>
                    Delete
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      padded={false}
      title={title ?? `${rows.length} ${rows.length === 1 ? entity.toLowerCase() : `${entity.toLowerCase()}s`}`}
      actions={
        <>
          <SearchBox value={q} onChange={setQ} />
          {headerActions}
          {canWrite && <Button onClick={() => setCreating(true)}>+ New {entity.toLowerCase()}</Button>}
        </>
      }
    >
      {error && (
        <div className="p-4">
          <ErrorBox message={error} />
        </div>
      )}
      {loading && !data ? <Loading /> : <DataTable columns={allColumns} rows={rows} />}
      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        title={`New ${entity.toLowerCase()}`}
        fields={fields}
        initial={defaults}
        submit={async (values) => {
          await api(endpoint, { body: toBody(values) });
          toast(`${entity} created`);
          reload();
        }}
      />
      <FormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${entity.toLowerCase()}`}
        fields={fields}
        initial={editing ? toForm(editing) : {}}
        submit={async (values) => {
          await api(`${endpoint}/${editing._id}`, { method: "PATCH", body: toBody(values) });
          toast(`${entity} updated`);
          reload();
        }}
      />
      {dialog}
    </Card>
  );
}

/** Loads options for a select from an API list. */
export function useOptions(path: string | null, label: (item: any) => string) {
  const { data } = useApi<{ items: any[] }>(path);
  return useMemo(() => (data?.items ?? []).map((i) => ({ value: String(i._id), label: label(i) })), [data, label]);
}
