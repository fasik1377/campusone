"use client";

import { useMemo, useState } from "react";
import { RequireRole, useMe } from "@/components/portal-shell";
import { Badge, Button, Card, Checkbox, DataTable, ErrorBox, Input, inputClass, Loading, Modal, PageHeader, SearchBox, Select, StatusBadge, useConfirm, useToast } from "@/components/ui";
import { api, fmtDateTime, useApi } from "@/lib/client";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
type RoleRow = { role: Role; department?: string };
type Options = { departments: { _id: string; name: string; code: string }[]; programs: { _id: string; name: string; code: string }[] };

function RoleRows({ value, onChange, options, allowStudent }: { value: RoleRow[]; onChange: (v: RoleRow[]) => void; options: Options | null; allowStudent: boolean }) {
  const roles = allowStudent ? ROLES : ROLES.filter((r) => r !== "student");
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-navy-900">Roles</legend>
      <div className="flex flex-col gap-2">
        {value.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <select aria-label="Role" className={inputClass} value={r.role} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, role: e.target.value as Role } : x)))}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <select aria-label="Department" className={inputClass} disabled={r.role === "student"} value={r.department ?? ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, department: e.target.value || undefined } : x)))}>
              <option value="">{r.role === "department_head" ? "Choose department…" : "Whole college"}</option>
              {options?.departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
            <button type="button" className="px-2 text-slate-400 hover:text-red-600" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove role">
              ✕
            </button>
          </div>
        ))}
        <div>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...value, { role: "instructor" }])}>
            + Add role
          </Button>
        </div>
      </div>
    </fieldset>
  );
}

const EMPTY = { name: "", username: "", email: "", password: "", mustChangePassword: true, college: "", roles: [{ role: "registrar" }] as RoleRow[], program: "", studentId: "" };

export default function UsersPage() {
  const me = useMe();
  const colleges = useApi<{ items: { _id: string; name: string; code: string; status: string }[] }>("/admin/colleges");
  const [college, setCollege] = useState("");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const query = new URLSearchParams({ ...(college && { college }), ...(role && { role }) }).toString();
  const { data, error, loading, reload } = useApi<{ items: any[] }>(`/admin/users${query ? `?${query}` : ""}`);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [rolesFor, setRolesFor] = useState<{ user: any; college: string } | null>(null);
  const [passwordFor, setPasswordFor] = useState<any | null>(null);
  const [revealed, setRevealed] = useState<{ username: string; password: string } | null>(null);
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  const collegeOptions = (colleges.data?.items ?? []).map((c) => ({ value: c._id, label: `${c.name} (${c.code})${c.status !== "active" ? ` — ${c.status.replace("_", " ")}` : ""}` }));
  const rows = useMemo(
    () => (data?.items ?? []).filter((u) => `${u.name} ${u.username} ${u.email}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  async function patch(user: any, body: Record<string, unknown>, success: string) {
    try {
      const res = await api(`/admin/users/${user._id}`, { method: "PATCH", body });
      if (res.temporaryPassword) setRevealed({ username: user.username, password: res.temporaryPassword });
      toast(success);
      reload();
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    }
  }

  return (
    <RequireRole superAdmin>
      <PageHeader
        title="Users & roles"
        description="Create accounts with a username and password, assign each person's role in a college, and manage passwords. People sign in with the username you give them and land on the dashboard for their role."
        actions={<Button onClick={() => setCreating(true)}>+ New user</Button>}
      />
      <div className="mb-4 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="College" value={college} onChange={(e) => setCollege(e.target.value)} options={collegeOptions} placeholder="All colleges" />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)} options={[{ value: "super_admin", label: "Super Admin" }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))]} placeholder="All roles" />
      </div>
      <ErrorBox message={error} />
      <Card padded={false} title={`${rows.length} users`} actions={<SearchBox value={q} onChange={setQ} placeholder="Search name, username, email…" />}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                key: "name",
                label: "User",
                render: (u) => (
                  <div>
                    <p className="font-medium text-navy-900">{u.name}</p>
                    <p className="font-mono text-xs text-slate-500">{u.username}</p>
                  </div>
                ),
              },
              {
                key: "roles",
                label: "Roles",
                render: (u) => (
                  <div className="flex max-w-md flex-wrap gap-1">
                    {u.isSuperAdmin && <Badge tone="gold">Super Admin</Badge>}
                    {u.roles.map((r: any, i: number) => (
                      <Badge key={i} tone={r.role === "student" ? "gray" : "blue"}>
                        {ROLE_LABELS[r.role as Role]}
                        {r.department ? ` · ${r.department.code}` : ""} · {r.college?.code}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              { key: "status", label: "Status", render: (u) => <div className="flex flex-col items-start gap-1"><StatusBadge status={u.status} />{u.mustChangePassword && <Badge tone="amber">Must change password</Badge>}</div> },
              { key: "lastLoginAt", label: "Last sign-in", render: (u) => fmtDateTime(u.lastLoginAt) },
              {
                key: "x",
                label: "",
                className: "text-right whitespace-nowrap",
                render: (u) => (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                      Edit
                    </Button>
                    {!u.isSuperAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => setRolesFor({ user: u, college: college || (u.roles[0]?.college?._id ?? "") })}>
                        Roles
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setPasswordFor(u)}>
                      Password
                    </Button>
                    {String(u._id) !== me.user.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={u.status === "active" ? "text-red-600" : ""}
                        onClick={async () => {
                          if (u.status === "active" && (await ask({ title: `Disable ${u.name}?`, message: "They will no longer be able to sign in. Their records are kept.", danger: true, confirm: "Disable" })) === null) return;
                          patch(u, { status: u.status === "active" ? "disabled" : "active" }, u.status === "active" ? "Account disabled" : "Account enabled");
                        }}
                      >
                        {u.status === "active" ? "Disable" : "Enable"}
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      {creating && <CreateUserModal collegeOptions={collegeOptions} defaultCollege={college} onClose={() => setCreating(false)} onCreated={(u) => { setRevealed(u); reload(); }} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSave={(body) => patch(editing, body, "User updated")} />}
      {rolesFor && <RolesModal user={rolesFor.user} initialCollege={rolesFor.college} collegeOptions={collegeOptions} onClose={() => setRolesFor(null)} onSave={(body) => patch(rolesFor.user, body, "Roles updated")} />}
      {passwordFor && (
        <PasswordModal
          user={passwordFor}
          self={String(passwordFor._id) === me.user.id}
          onClose={() => setPasswordFor(null)}
          onSave={async (body) => {
            const okay = await patch(passwordFor, body, "Password updated");
            if (okay && body.password && String(passwordFor._id) !== me.user.id) setRevealed({ username: passwordFor.username, password: body.password as string });
            return okay;
          }}
        />
      )}
      <Modal open={!!revealed} onClose={() => setRevealed(null)} title="Sign-in details" footer={<Button onClick={() => setRevealed(null)}>Done</Button>}>
        <p className="text-sm text-slate-600">Give these details to the user privately. They will be asked to set their own password when they first sign in.</p>
        <p className="mt-3 rounded-lg bg-navy-50 p-3 font-mono text-sm">
          Username: {revealed?.username}
          <br />
          Password: {revealed?.password}
        </p>
      </Modal>
      {dialog}
    </RequireRole>
  );
}

function useCollegeOptions(collegeId: string) {
  return useApi<Options>(collegeId ? `/admin/colleges/${collegeId}/options` : null).data;
}

function CreateUserModal({ collegeOptions, defaultCollege, onClose, onCreated }: { collegeOptions: { value: string; label: string }[]; defaultCollege: string; onClose: () => void; onCreated: (u: { username: string; password: string }) => void }) {
  const [v, setV] = useState({ ...EMPTY, college: defaultCollege });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const options = useCollegeOptions(v.college);
  const isStudent = v.roles.some((r) => r.role === "student");
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/admin/users", { body: { ...v, program: isStudent ? v.program : undefined, studentId: isStudent ? v.studentId : undefined } });
      toast(`Account ${v.username} created`);
      onCreated({ username: v.username.toLowerCase(), password: v.password });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="New user"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="new-user" loading={saving}>Create account</Button>
        </>
      }
    >
      <form id="new-user" onSubmit={submit} className="flex flex-col gap-4">
        <ErrorBox message={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full name" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          <Input label="Email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          <Input label="Username" required hint="Letters, numbers, dot, dash, underscore or @ — e.g. abc.registrar2" value={v.username} onChange={(e) => setV({ ...v, username: e.target.value })} />
          <Input label="Password" type="text" required hint="8+ characters with a letter and a number" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
          <Select className="sm:col-span-2" label="College" required value={v.college} onChange={(e) => setV({ ...v, college: e.target.value, roles: v.roles.map((r) => ({ role: r.role })), program: "" })} options={collegeOptions} placeholder="Choose a college…" />
        </div>
        {v.college && <RoleRows value={v.roles} onChange={(roles) => setV({ ...v, roles })} options={options ?? null} allowStudent />}
        {isStudent && (
          <div className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
            <Select label="Program (student)" required value={v.program} onChange={(e) => setV({ ...v, program: e.target.value })} options={(options?.programs ?? []).map((p) => ({ value: p._id, label: `${p.code} — ${p.name}` }))} placeholder="Choose a program…" />
            <Input label="Student ID" hint="Leave empty to generate" value={v.studentId} onChange={(e) => setV({ ...v, studentId: e.target.value })} />
          </div>
        )}
        <Checkbox label="Ask the user to change this password at first sign-in" checked={v.mustChangePassword} onChange={(c) => setV({ ...v, mustChangePassword: c })} />
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSave }: { user: any; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [v, setV] = useState({ name: user.name, username: user.username, email: user.email ?? "" });
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${user.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={async () => { setSaving(true); if (await onSave(v)) onClose(); setSaving(false); }}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Full name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <Input label="Username" value={v.username} onChange={(e) => setV({ ...v, username: e.target.value })} />
        <Input label="Email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </div>
    </Modal>
  );
}

function RolesModal({ user, initialCollege, collegeOptions, onClose, onSave }: { user: any; initialCollege: string; collegeOptions: { value: string; label: string }[]; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const rolesIn = (c: string) => user.roles.filter((r: any) => r.college?._id === c && r.role !== "student").map((r: any) => ({ role: r.role, department: r.department?._id }));
  const [college, setCollege] = useState(initialCollege);
  const [roles, setRoles] = useState<RoleRow[]>(rolesIn(initialCollege));
  const [saving, setSaving] = useState(false);
  const options = useCollegeOptions(college);
  const hasStudent = user.roles.some((r: any) => r.role === "student" && r.college?._id === college);
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Roles for ${user.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={!college} onClick={async () => { setSaving(true); if (await onSave({ collegeRoles: { college, roles } })) onClose(); setSaving(false); }}>Save roles</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="College" value={college} onChange={(e) => { setCollege(e.target.value); setRoles(rolesIn(e.target.value)); }} options={collegeOptions} placeholder="Choose a college…" />
        {hasStudent && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">This person is a student here; the Student role stays linked to their student record.</p>}
        {college && <RoleRows value={roles} onChange={setRoles} options={options ?? null} allowStudent={false} />}
        <p className="text-xs text-slate-500">Saving replaces this user&apos;s staff roles in the selected college only. Roles in other colleges are untouched.</p>
      </div>
    </Modal>
  );
}

function PasswordModal({ user, self, onClose, onSave }: { user: any; self: boolean; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [mustChange, setMustChange] = useState(!self);
  const [saving, setSaving] = useState(false);
  const run = async (body: Record<string, unknown>) => {
    setSaving(true);
    if (await onSave(body)) onClose();
    setSaving(false);
  };
  return (
    <Modal open onClose={onClose} title={`Password for ${user.name}`}>
      <div className="flex flex-col gap-4">
        <Input label="New password" type="text" hint="8+ characters with a letter and a number" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Checkbox label="Ask them to change it at next sign-in" checked={mustChange} onChange={setMustChange} />
        <div className="flex flex-wrap gap-2">
          <Button loading={saving} disabled={password.length < 8} onClick={() => run({ password, mustChangePassword: mustChange })}>
            Set this password
          </Button>
          {!self && (
            <Button variant="secondary" loading={saving} onClick={() => run({ resetPassword: true })}>
              Generate a temporary password
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
