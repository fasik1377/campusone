"use client";

import { useState } from "react";
import { useMe } from "@/components/portal-shell";
import { Button, Card, DescriptionList, ErrorBox, Input, Notice, PageHeader, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { ROLE_LABELS } from "@/lib/roles";

export default function AccountPage() {
  const me = useMe();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.newPassword !== form.confirm) return setError("The new passwords do not match.");
    setSaving(true);
    try {
      await api("/auth/password", { body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast("Password changed");
      me.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="My account" />
      <div className="flex flex-col gap-6">
        <Card title="Profile">
          <DescriptionList
            items={[
              ["Name", me.user.name],
              ["Username", me.user.username],
              ["Email", me.user.email],
              ["College", me.college ? `${me.college.name} (${me.college.code})` : "Platform"],
              ["Roles", [me.user.isSuperAdmin && "Super Admin", ...me.roles.map((r) => ROLE_LABELS[r])].filter(Boolean).join(", ")],
            ]}
          />
        </Card>
        <Card title="Change password">
          {me.user.mustChangePassword && (
            <div className="mb-4">
              <Notice tone="amber">You are using a temporary password. Choose a new one to unlock the portal.</Notice>
            </div>
          )}
          <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
            <ErrorBox message={error} />
            <Input label="Current password" type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
            <Input label="New password" type="password" required autoComplete="new-password" hint="At least 8 characters, including a letter and a number." value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            <Input label="Confirm new password" type="password" required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            <div>
              <Button type="submit" loading={saving}>
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
