"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { FormModal, type FieldDef } from "@/components/resource";
import { Badge, Button, Card, DataTable, DescriptionList, ErrorBox, Loading, PageHeader, StatCard, StatusBadge, useConfirm, useToast } from "@/components/ui";
import { api, fmtDate, fmtDateTime, useApi } from "@/lib/client";
import { humanize, MODULE_KEYS, MODULE_LABELS } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */

const profileFields: FieldDef[] = [
  { name: "name", label: "College name", required: true },
  { name: "tagline", label: "Tagline" },
  { name: "email", label: "Contact email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "website", label: "Website" },
  { name: "brandColor", label: "Brand colour", placeholder: "#1E8E3E" },
  { name: "coverImage", label: "Cover image path or URL", placeholder: "/banner.jpg", hint: "Wide banner shown on the public college page" },
  { name: "address", label: "Address" },
  { name: "description", label: "About the college", type: "textarea" },
  { name: "enabledModules", label: "Enabled modules", type: "multiselect", options: MODULE_KEYS.map((k) => ({ value: k, label: MODULE_LABELS[k] })) },
];

const adminFields: FieldDef[] = [
  { name: "existingUsername", label: "Existing username", hint: "Fill this OR the new-account fields below", full: true },
  { name: "name", label: "Full name" },
  { name: "username", label: "Username" },
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Initial password", type: "password" },
];

export default function CollegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<any>(`/admin/colleges/${id}`);
  const [editing, setEditing] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  async function setStatus(status: string) {
    const needsReason = status === "suspended" || status === "archived";
    const reason = await ask({
      title: `${humanize(status === "active" ? "activate" : status)} college?`,
      message:
        status === "active"
          ? "The college will appear in the public directory and its users can sign in."
          : status === "suspended"
            ? "College users lose portal access. All academic records are preserved."
            : "Archived colleges are hidden and read-only. Records are preserved.",
      reason: needsReason,
      danger: needsReason,
      confirm: "Confirm",
    });
    if (reason === null) return;
    try {
      await api(`/admin/colleges/${id}/status`, { body: { status, reason: reason || undefined } });
      toast(`College ${humanize(status).toLowerCase()}`);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function uploadLogo(file: File) {
    const form = new FormData();
    form.append("file", file);
    try {
      await api(`/admin/colleges/${id}/logo`, { form });
      toast("Logo updated");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function removeAdmin(userId: string) {
    if ((await ask({ title: "Remove administrator?", message: "They lose the College Admin role for this college.", danger: true, confirm: "Remove" })) === null) return;
    try {
      await api(`/admin/colleges/${id}/admins?userId=${userId}`, { method: "DELETE" });
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const c = data?.item;
  return (
    <RequireRole superAdmin>
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {c && (
        <>
          <PageHeader
            back={{ href: "/portal/colleges", label: "All colleges" }}
            title={c.name}
            description={
              <span className="flex items-center gap-2">
                <span className="font-mono">{c.code}</span> <StatusBadge status={c.status} />
                {c.statusReason && <span className="text-slate-500">— {c.statusReason}</span>}
              </span>
            }
            actions={
              <>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit profile
                </Button>
                {c.status !== "active" && (
                  <Button variant="gold" onClick={() => setStatus("active")}>
                    Activate
                  </Button>
                )}
                {c.status === "active" && (
                  <Button variant="danger" onClick={() => setStatus("suspended")}>
                    Suspend
                  </Button>
                )}
                {c.status !== "archived" && (
                  <Button variant="secondary" onClick={() => setStatus("archived")}>
                    Archive
                  </Button>
                )}
              </>
            }
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Students" value={data.stats.students} />
            <StatCard label="Staff" value={data.stats.staff} />
            <StatCard label="Departments" value={data.stats.departments} />
            <StatCard label="Programs" value={data.stats.programs} />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Profile" className="xl:col-span-2">
              <DescriptionList
                items={[
                  ["Email", c.email],
                  ["Phone", c.phone],
                  ["Website", c.website],
                  ["Address", c.address],
                  ["Created", fmtDate(c.createdAt)],
                  ["Time zone", c.timezone],
                  [
                    "Enabled modules",
                    <span key="m" className="flex flex-wrap gap-1">
                      {c.enabledModules.map((m: keyof typeof MODULE_LABELS) => (
                        <Badge key={m} tone="blue">
                          {MODULE_LABELS[m] ?? m}
                        </Badge>
                      ))}
                    </span>,
                  ],
                  ["Public page", c.status === "active" ? `/colleges/${c.slug}` : "Hidden until active"],
                ]}
              />
            </Card>
            <Card title="Logo">
              <div className="flex flex-col items-center gap-3">
                <Image
                  src={c.logoFileId ? `/api/v1/files/${c.logoFileId}` : "/logo.png"}
                  alt={`${c.name} logo`}
                  width={120}
                  height={120}
                  unoptimized
                  className="h-28 w-28 rounded-lg border border-slate-200 object-contain p-2"
                />
                <label className="cursor-pointer text-sm font-medium text-navy-500 hover:underline">
                  Upload new logo (PNG/JPG/WEBP, ≤5 MB)
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                </label>
              </div>
            </Card>
            <Card title="College administrators" className="xl:col-span-2" actions={<Button size="sm" onClick={() => setAddingAdmin(true)}>+ Assign admin</Button>} padded={false}>
              <DataTable
                rows={data.admins}
                empty="No administrator assigned yet."
                columns={[
                  { key: "name", label: "Name" },
                  { key: "username", label: "Username" },
                  { key: "email", label: "Email" },
                  { key: "lastLoginAt", label: "Last login", render: (u: any) => fmtDateTime(u.lastLoginAt) },
                  {
                    key: "x",
                    label: "",
                    className: "text-right",
                    render: (u: any) => (
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeAdmin(u._id)}>
                        Remove
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
            <Card title="Recent activity">
              <ul className="flex flex-col gap-2 text-sm">
                {data.activity.map((a: any) => (
                  <li key={a._id}>
                    <b className="text-navy-900">{a.actorName}</b> {humanize(a.action)}
                    <span className="block text-xs text-slate-400">{fmtDateTime(a.createdAt)}</span>
                  </li>
                ))}
                {!data.activity.length && <li className="text-slate-500">No activity yet.</li>}
              </ul>
            </Card>
          </div>
          <FormModal
            open={editing}
            onClose={() => setEditing(false)}
            title="Edit college"
            fields={profileFields}
            initial={c}
            submit={async (v) => {
              const { name, tagline, email, phone, website, address, description, enabledModules, brandColor, coverImage } = v;
              await api(`/admin/colleges/${id}`, { method: "PATCH", body: { name, tagline, email, phone, website, address, description, enabledModules, brandColor, coverImage } });
              toast("College updated");
              reload();
            }}
          />
          <FormModal
            open={addingAdmin}
            onClose={() => setAddingAdmin(false)}
            title="Assign college administrator"
            fields={adminFields}
            initial={{}}
            submit={async (v) => {
              await api(`/admin/colleges/${id}/admins`, { body: v });
              toast("Administrator assigned");
              reload();
            }}
          />
          {dialog}
        </>
      )}
    </RequireRole>
  );
}
