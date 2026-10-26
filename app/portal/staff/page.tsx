"use client";

import { useMemo, useState } from "react";
import { RequireRole, useMe } from "@/components/portal-shell";
import { FormModal, useOptions, type FieldDef } from "@/components/resource";
import { Badge, Button, Card, DataTable, ErrorBox, Input, inputClass, Loading, Modal, PageHeader, SearchBox, StatusBadge, useConfirm, useToast } from "@/components/ui";
import { api, fmtDateTime, useApi } from "@/lib/client";
import { ROLE_LABELS, STAFF_ROLES, type Role } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
type RoleRow = { role: Role; department?: string };
const deptLabel = (d: any) => `${d.code} — ${d.name}`;

function RolesEditor({ value, onChange, departments }: { value: RoleRow[]; onChange: (v: RoleRow[]) => void; departments: { value: string; label: string }[] }) {
  const rows = value ?? [];
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-navy-900">Roles in this college</legend>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <select aria-label="Role" className={inputClass} value={r.role} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, role: e.target.value as Role } : x)))}>
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <select aria-label="Department scope" className={inputClass} value={r.department ?? ""} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, department: e.target.value || undefined } : x)))}>
              <option value="">{r.role === "department_head" ? "Choose department…" : "Whole college"}</option>
              {departments.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <button type="button" className="px-2 text-slate-400 hover:text-red-600" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove role">
              ✕
            </button>
          </div>
        ))}
        <div>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...rows, { role: "instructor" }])}>
            + Add role
          </Button>
        </div>
        <p className="text-xs text-slate-500">A person can hold several roles (e.g. Instructor and Department Head). Department scope limits deans and heads to that department.</p>
      </div>
    </fieldset>
  );
}

export default function StaffPage() {
  const me = useMe();
  const { data, error, loading, reload } = useApi<{ items: any[] }>("/staff");
  const departments = useOptions("/departments", deptLabel);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [password, setPassword] = useState<{ username: string; password: string } | null>(null);
  const [passwordFor, setPasswordFor] = useState<any | null>(null);
  const [chosen, setChosen] = useState("");
  const [q, setQ] = useState("");
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  const rows = useMemo(
    () => (data?.items ?? []).filter((u) => `${u.name} ${u.username} ${u.email}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  const rolesField: FieldDef = { name: "roles", label: "Roles", type: "custom", render: (v, set) => <RolesEditor value={v} onChange={set} departments={departments} /> };

  async function patch(user: any, body: Record<string, unknown>, success: string) {
    try {
      const res = await api(`/staff/${user._id}`, { method: "PATCH", body });
      if (res.temporaryPassword) setPassword({ username: user.username, password: res.temporaryPassword });
      toast(success);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <RequireRole roles={["college_admin"]}>
      <PageHeader title="Staff accounts" description="Create accounts for registrars, deans, department heads, instructors, admissions and finance officers, and assign their roles." actions={<Button onClick={() => setCreating(true)}>+ New staff account</Button>} />
      <ErrorBox message={error} />
      <Card padded={false} title={`${rows.length} staff`} actions={<SearchBox value={q} onChange={setQ} />}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: "name", label: "Name", render: (u) => <span className="font-medium text-navy-900">{u.name}</span> },
              { key: "username", label: "Username" },
              {
                key: "roles",
                label: "Roles",
                render: (u) => (
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r: any, i: number) => (
                      <Badge key={i} tone={r.role === "college_admin" ? "gold" : "blue"}>
                        {ROLE_LABELS[r.role as Role]}
                        {r.department ? ` · ${r.department.code}` : ""}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              { key: "status", label: "Status", render: (u) => <StatusBadge status={u.status} /> },
              { key: "lastLoginAt", label: "Last login", render: (u) => fmtDateTime(u.lastLoginAt) },
              {
                key: "x",
                label: "",
                className: "text-right whitespace-nowrap",
                render: (u) =>
                  String(u._id) === me.user.id ? (
                    <span className="text-xs text-slate-400">You</span>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPasswordFor(u)}>
                        Password
                      </Button>
                      <Button size="sm" variant="ghost" className={u.status === "active" ? "text-red-600" : ""} onClick={() => patch(u, { status: u.status === "active" ? "disabled" : "active" }, u.status === "active" ? "Account disabled" : "Account enabled")}>
                        {u.status === "active" ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  ),
              },
            ]}
          />
        )}
      </Card>

      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New staff account"
        wide
        fields={[
          { name: "name", label: "Full name", required: true },
          { name: "username", label: "Username", required: true, hint: "Letters, numbers, dot, dash or underscore" },
          { name: "email", label: "Email", type: "email" },
          { name: "password", label: "Initial password", type: "password", required: true, hint: "They must change it at first sign-in" },
          rolesField,
        ]}
        initial={{ roles: [{ role: "instructor" }] }}
        submit={async (v) => {
          await api("/staff", { body: v });
          toast(`Account ${v.username} created`);
          reload();
        }}
      />
      <FormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
        wide
        fields={[{ name: "name", label: "Full name", required: true }, { name: "email", label: "Email", type: "email" }, rolesField]}
        initial={editing ? { name: editing.name, email: editing.email, roles: editing.roles.map((r: any) => ({ role: r.role, department: r.department?._id })) } : {}}
        submit={async (v) => {
          await api(`/staff/${editing._id}`, { method: "PATCH", body: v });
          toast("Staff account updated");
          reload();
        }}
      />
      <Modal
        open={!!passwordFor}
        onClose={() => {
          setPasswordFor(null);
          setChosen("");
        }}
        title={`Password for ${passwordFor?.name ?? ""}`}
      >
        <div className="flex flex-col gap-4">
          <Input label="New password" type="text" hint="8+ characters with a letter and a number. They must change it at next sign-in." value={chosen} onChange={(e) => setChosen(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={chosen.length < 8}
              onClick={async () => {
                const u = passwordFor;
                const pw = chosen;
                setPasswordFor(null);
                setChosen("");
                try {
                  await api(`/staff/${u._id}`, { method: "PATCH", body: { password: pw } });
                  setPassword({ username: u.username, password: pw });
                  toast("Password set");
                } catch (e) {
                  toast((e as Error).message, "error");
                }
              }}
            >
              Set this password
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const u = passwordFor;
                setPasswordFor(null);
                setChosen("");
                patch(u, { resetPassword: true }, "Password reset");
              }}
            >
              Generate a temporary password
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={!!password} onClose={() => setPassword(null)} title="Sign-in details" footer={<Button onClick={() => setPassword(null)}>Done</Button>}>
        <p className="text-sm text-slate-600">Share these credentials securely. The user must change the password at first sign-in.</p>
        <p className="mt-3 rounded-lg bg-navy-50 p-3 font-mono text-sm">
          Username: {password?.username}
          <br />
          Password: {password?.password}
        </p>
      </Modal>
      {dialog}
    </RequireRole>
  );
}
