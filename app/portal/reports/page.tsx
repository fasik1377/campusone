"use client";

import { useState } from "react";
import { DownloadButton } from "@/components/excel";
import { RequireRole, useMe } from "@/components/portal-shell";
import { useOptions } from "@/components/resource";
import { ButtonLink, Card, PageHeader, Select } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const semesterLabel = (s: any) => `${s.name} ${s.academicYear}${s.isCurrent ? " (current)" : ""}`;

function ReportCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="font-semibold text-navy-900">{title}</h3>
      <p className="mt-1 mb-4 text-sm text-slate-600">{description}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  );
}

export default function ReportsPage() {
  const me = useMe();
  const semesters = useOptions("/semesters", semesterLabel);
  const [semester, setSemester] = useState("");
  const q = semester ? `?semester=${semester}` : "";

  return (
    <RequireRole roles={["registrar", "college_admin"]}>
      <PageHeader title="Reports & Excel" description="Download official records as Excel workbooks, and upload data in bulk." />
      <div className="mb-6 max-w-xs">
        <Select label="Semester for semester reports" value={semester} onChange={(e) => setSemester(e.target.value)} options={semesters} placeholder="Current semester" />
      </div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Downloads</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard title="Student list" description="All students with program, cohort, status and contact details.">
          <DownloadButton path="/students/export" variant="primary">Students (.xlsx)</DownloadButton>
        </ReportCard>
        <ReportCard title="Enrollment report" description="Head counts by program, department and cohort, broken down by status.">
          <DownloadButton path="/reports/enrollment" variant="primary">Enrollment (.xlsx)</DownloadButton>
        </ReportCard>
        <ReportCard title="Registration list" description="Every course registration in the selected semester with its approval status.">
          <DownloadButton path={`/reports/registrations${q}`} variant="primary">Registrations (.xlsx)</DownloadButton>
        </ReportCard>
        <ReportCard title="Result sheet" description="Published grades for the semester with each student's semester GPA.">
          <DownloadButton path={`/reports/results${q}`} variant="primary">Results (.xlsx)</DownloadButton>
        </ReportCard>
      </div>
      {me.has("registrar") && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Uploads</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ReportCard title="Bulk student import" description="Fill the template and upload it to create student records and login accounts in one step.">
              <DownloadButton path="/students/template">Template</DownloadButton>
              <ButtonLink href="/portal/students" variant="gold">Upload on Students page</ButtonLink>
            </ReportCard>
          </div>
        </>
      )}
    </RequireRole>
  );
}
