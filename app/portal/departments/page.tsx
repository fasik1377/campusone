"use client";

import { RequireRole, useMe } from "@/components/portal-shell";
import { ResourceManager } from "@/components/resource";
import { PageHeader } from "@/components/ui";

export default function DepartmentsPage() {
  const me = useMe();
  return (
    <RequireRole roles={["college_admin", "dean", "department_head"]}>
      <PageHeader title="Departments" description="The institutional hierarchy that programs, courses and students belong to." />
      <ResourceManager
        endpoint="/departments"
        entity="Department"
        canWrite={me.has("college_admin")}
        columns={[
          { key: "code", label: "Code", render: (d) => <span className="font-mono">{d.code}</span> },
          { key: "name", label: "Name", render: (d) => <span className="font-medium text-navy-900">{d.name}</span> },
          { key: "description", label: "Description" },
        ]}
        fields={[
          { name: "name", label: "Department name", required: true },
          { name: "code", label: "Code", required: true, placeholder: "e.g. CS" },
          { name: "description", label: "Description", type: "textarea" },
        ]}
      />
    </RequireRole>
  );
}
