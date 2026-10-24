"use client";

import { useState } from "react";
import { useMe } from "@/components/portal-shell";
import { FormModal } from "@/components/resource";
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, useConfirm, useToast } from "@/components/ui";
import { api, fmtDateTime, useApi } from "@/lib/client";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";

type Announcement = { _id: string; title: string; body: string; audience: Role[]; isPublic: boolean; college?: string | null; createdBy?: string; createdAt: string };

export default function AnnouncementsPage() {
  const me = useMe();
  const canManage = me.user.isSuperAdmin || me.has("college_admin", "registrar", "dean", "department_head");
  const { data, error, loading, reload } = useApi<{ items: Announcement[] }>(`/announcements${canManage ? "?manage=1" : ""}`);
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const { ask, dialog } = useConfirm();

  return (
    <div className="max-w-4xl">
      <PageHeader title="Announcements" description="Notices for your college and platform-wide updates." actions={canManage && <Button onClick={() => setCreating(true)}>+ New announcement</Button>} />
      <ErrorBox message={error} />
      {loading && !data && <Loading />}
      {data && !data.items.length && (
        <Card>
          <Empty title="No announcements yet" />
        </Card>
      )}
      <div className="flex flex-col gap-4">
        {data?.items.map((a) => (
          <Card key={a._id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-navy-900">{a.title}</h2>
                <p className="text-xs text-slate-500">
                  {fmtDateTime(a.createdAt)} · {a.createdBy}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {!a.college && <Badge tone="gold">Platform-wide</Badge>}
                {a.isPublic && <Badge tone="green">Public</Badge>}
                {a.audience.length ? a.audience.map((r) => <Badge key={r} tone="blue">{ROLE_LABELS[r]}</Badge>) : <Badge>Everyone</Badge>}
                {canManage && (!a.college ? me.user.isSuperAdmin : !!me.college) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={async () => {
                      if ((await ask({ title: "Delete announcement?", message: a.title, danger: true, confirm: "Delete" })) === null) return;
                      try {
                        await api(`/announcements/${a._id}`, { method: "DELETE" });
                        reload();
                      } catch (e) {
                        toast((e as Error).message, "error");
                      }
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{a.body}</p>
          </Card>
        ))}
      </div>
      <FormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New announcement"
        wide
        fields={[
          { name: "title", label: "Title", required: true, full: true },
          { name: "body", label: "Message", type: "textarea", required: true },
          { name: "audience", label: "Audience (leave empty for everyone)", type: "multiselect", options: ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
          { name: "isPublic", label: "Also show publicly (home page news and the college page)", type: "checkbox" as const },
          ...(me.user.isSuperAdmin ? [{ name: "platformWide", label: "Platform-wide (all colleges)", type: "checkbox" as const }] : []),
        ]}
        initial={{ audience: [], isPublic: false, platformWide: !me.college }}
        submit={async (v) => {
          await api("/announcements", { body: v });
          toast("Announcement published");
          reload();
        }}
      />
      {dialog}
    </div>
  );
}
