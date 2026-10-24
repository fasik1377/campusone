"use client";

import Link from "next/link";
import { useState } from "react";
import { RequireRole, useMe } from "@/components/portal-shell";
import { Card, DataTable, ErrorBox, Loading, PageHeader, StatusBadge, Tabs } from "@/components/ui";
import { fmtDateTime, useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function GradeApprovalsPage() {
  const me = useMe();
  const reviewer = me.has("department_head", "dean");
  const [tab, setTab] = useState<string>(me.has("registrar") && !reviewer ? "approved" : "submitted");
  const { data, error, loading } = useApi<{ items: any[] }>(`/grades/review?status=${tab}`);

  return (
    <RequireRole roles={["registrar", "department_head", "dean", "college_admin"]}>
      <PageHeader
        title="Grade approvals"
        description="Workflow: instructor submits → department head / dean approves → registrar publishes. Students only see grades after publication."
      />
      <Tabs
        tabs={[
          { key: "submitted", label: reviewer ? "Awaiting my approval" : "Submitted" },
          { key: "approved", label: me.has("registrar") ? "Ready to publish" : "Approved" },
          { key: "returned", label: "Returned to instructor" },
          { key: "published", label: "Published" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <ErrorBox message={error} />
      <Card padded={false}>
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={data?.items ?? []}
            empty="Nothing in this list."
            columns={[
              { key: "course", label: "Course", render: (s) => <span className="font-medium text-navy-900">{s.course?.code} — {s.course?.title}</span> },
              { key: "name", label: "Sec." },
              { key: "semester", label: "Semester", render: (s) => `${s.semester?.name} ${s.semester?.academicYear}` },
              { key: "instructor", label: "Instructor", render: (s) => s.instructor?.name },
              { key: "gradeStatus", label: "Status", render: (s) => <StatusBadge status={s.gradeStatus} /> },
              { key: "last", label: "Last action", render: (s) => { const l = s.gradeLog?.at(-1); return l ? `${l.byName}, ${fmtDateTime(l.at)}` : "—"; } },
              { key: "x", label: "", className: "text-right", render: (s) => <Link href={`/portal/teaching/${s._id}?tab=grades`} className="text-sm text-navy-500 hover:underline">Review grades →</Link> },
            ]}
          />
        )}
      </Card>
    </RequireRole>
  );
}
