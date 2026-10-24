"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { FormModal, type FieldDef } from "@/components/resource";
import { Button, Card, DataTable, ErrorBox, Loading, PageHeader, SearchBox, StatusBadge, useToast } from "@/components/ui";
import { api, fmtDate, useApi } from "@/lib/client";
import { MODULE_KEYS, MODULE_LABELS } from "@/lib/roles";

type College = { _id: string; name: string; code: string; status: string; email?: string; address?: string; createdAt: string; studentCount: number; staffCount: number };

const fields: FieldDef[] = [
  { name: "name", label: "College name", required: true },
  { name: "code", label: "College code", required: true, hint: "Unique short code, e.g. ATC. Used in student IDs." },
  { name: "tagline", label: "Tagline", full: true },
  { name: "email", label: "Contact email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "website", label: "Website" },
  { name: "address", label: "Address" },
  { name: "description", label: "About the college", type: "textarea" },
  {
    name: "enabledModules",
    label: "Enabled modules",
    type: "multiselect",
    options: MODULE_KEYS.map((k) => ({ value: k, label: MODULE_LABELS[k] })),
  },
  {
    name: "_adminHeading",
    label: "",
    type: "custom",
    render: () => (
      <div className="border-t border-slate-100 pt-3">
        <p className="font-semibold text-navy-900">Initial College Admin</p>
        <p className="text-xs text-slate-500">Assign an existing user by username, or create a new account. They will be asked to change the password at first login.</p>
      </div>
    ),
  },
  { name: "existingAdminUsername", label: "Existing username (optional)" },
  { name: "adminName", label: "New admin full name" },
  { name: "adminUsername", label: "New admin username" },
  { name: "adminEmail", label: "New admin email", type: "email" },
  { name: "adminPassword", label: "Initial password", type: "password", hint: "8+ characters with a letter and a number" },
];

export default function CollegesPage() {
  const { data, error, loading, reload } = useApi<{ items: College[] }>("/admin/colleges");
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const toast = useToast();

  const rows = useMemo(
    () => (data?.items ?? []).filter((c) => `${c.name} ${c.code} ${c.address}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  return (
    <RequireRole superAdmin>
      <PageHeader
        title="Colleges"
        description="Create colleges, assign their administrators, and control activation. Suspending a college blocks its users but never deletes academic records."
        actions={<Button onClick={() => setCreating(true)}>+ New college</Button>}
      />
      <ErrorBox message={error} />
      <Card padded={false} title={`${rows.length} colleges`} actions={<SearchBox value={q} onChange={setQ} />}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: "name",
                label: "College",
                render: (c) => (
                  <Link href={`/portal/colleges/${c._id}`} className="font-medium text-navy-900 hover:underline">
                    {c.name}
                  </Link>
                ),
              },
              { key: "code", label: "Code", render: (c) => <span className="font-mono">{c.code}</span> },
              { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} /> },
              { key: "studentCount", label: "Students" },
              { key: "staffCount", label: "Staff" },
              { key: "createdAt", label: "Created", render: (c) => fmtDate(c.createdAt) },
              {
                key: "open",
                label: "",
                className: "text-right",
                render: (c) => (
                  <Link href={`/portal/colleges/${c._id}`} className="text-sm text-navy-500 hover:underline">
                    Manage →
                  </Link>
                ),
              },
            ]}
          />
        )}
      </Card>
      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create college"
        fields={fields}
        initial={{ enabledModules: [...MODULE_KEYS] }}
        submitLabel="Create college"
        submit={async (values) => {
          const body = Object.fromEntries(Object.entries(values).filter(([k]) => !k.startsWith("_")));
          await api("/admin/colleges", { body });
          toast("College created in setup mode");
          reload();
        }}
      />
    </RequireRole>
  );
}
