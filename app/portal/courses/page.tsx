"use client";

import { RequireRole, useMe } from "@/components/portal-shell";
import { ResourceManager, useOptions } from "@/components/resource";
import { PageHeader } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const deptLabel = (d: any) => `${d.code} — ${d.name}`;
const courseLabel = (c: any) => `${c.code} — ${c.title}`;

export default function CoursesPage() {
  const me = useMe();
  const departments = useOptions("/departments", deptLabel);
  const courses = useOptions("/courses", courseLabel);
  return (
    <RequireRole roles={["college_admin", "dean", "department_head", "registrar"]}>
      <PageHeader title="Course catalog" description="Courses, credit hours and prerequisites. Registration enforces prerequisites automatically." />
      <ResourceManager
        endpoint="/courses"
        entity="Course"
        canWrite={me.has("college_admin", "department_head")}
        defaults={{ credits: 3, prerequisites: [] }}
        toForm={(c) => ({ ...c, department: c.department?._id, prerequisites: (c.prerequisites ?? []).map((p: any) => p._id) })}
        columns={[
          { key: "code", label: "Code", render: (c) => <span className="font-mono font-medium text-navy-900">{c.code}</span> },
          { key: "title", label: "Title" },
          { key: "credits", label: "Credits" },
          { key: "department", label: "Department", render: (c) => c.department?.code },
          { key: "prerequisites", label: "Prerequisites", render: (c) => (c.prerequisites ?? []).map((p: any) => p.code).join(", ") || "—" },
        ]}
        searchKeys={["code", "title", "department.code"]}
        fields={[
          { name: "code", label: "Course code", required: true, placeholder: "e.g. CS201" },
          { name: "title", label: "Title", required: true },
          { name: "department", label: "Department", type: "select", options: departments, required: true },
          { name: "credits", label: "Credit hours", type: "number", required: true },
          { name: "description", label: "Description / learning outcomes", type: "textarea" },
          { name: "prerequisites", label: "Prerequisites", type: "multiselect", options: courses },
        ]}
      />
    </RequireRole>
  );
}
