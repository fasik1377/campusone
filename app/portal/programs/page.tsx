"use client";

import { RequireRole, useMe } from "@/components/portal-shell";
import { ResourceManager, useOptions } from "@/components/resource";
import { Badge, PageHeader } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const deptLabel = (d: any) => `${d.code} — ${d.name}`;

export default function ProgramsPage() {
  const me = useMe();
  const departments = useOptions("/departments", deptLabel);
  return (
    <RequireRole roles={["college_admin", "dean", "department_head", "registrar"]}>
      <PageHeader title="Academic programs" description="Programs students are admitted to. Open programs appear on your public admissions page." />
      <ResourceManager
        endpoint="/programs"
        entity="Program"
        canWrite={me.has("college_admin")}
        defaults={{ level: "Degree", durationYears: 4, totalCredits: 120, minGpa: 2, admissionOpen: true }}
        toForm={(p) => ({ ...p, department: p.department?._id })}
        columns={[
          { key: "code", label: "Code", render: (p) => <span className="font-mono">{p.code}</span> },
          { key: "name", label: "Program", render: (p) => <span className="font-medium text-navy-900">{p.name}</span> },
          { key: "department", label: "Department", render: (p) => p.department?.name },
          { key: "level", label: "Level" },
          { key: "totalCredits", label: "Credits" },
          { key: "admissionOpen", label: "Admissions", render: (p) => (p.admissionOpen ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>) },
        ]}
        searchKeys={["code", "name", "department.name", "level"]}
        fields={[
          { name: "name", label: "Program name", required: true },
          { name: "code", label: "Program code", required: true },
          { name: "department", label: "Department", type: "select", options: departments, required: true },
          { name: "level", label: "Level", type: "select", options: ["Certificate", "Diploma", "Degree", "Masters", "PhD"].map((v) => ({ value: v, label: v })) },
          { name: "durationYears", label: "Duration (years)", type: "number", step: "0.5" },
          { name: "totalCredits", label: "Credits to graduate", type: "number" },
          { name: "minGpa", label: "Minimum CGPA to graduate", type: "number", step: "0.01" },
          { name: "admissionOpen", label: "Accepting applications", type: "checkbox" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "admissionRequirements", label: "Admission requirements", type: "textarea" },
        ]}
      />
    </RequireRole>
  );
}
