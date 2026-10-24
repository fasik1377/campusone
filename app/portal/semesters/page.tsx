"use client";

import { RequireRole, useMe } from "@/components/portal-shell";
import { ResourceManager } from "@/components/resource";
import { Badge, PageHeader } from "@/components/ui";
import { fmtDate, isoDate } from "@/lib/client";

export default function SemestersPage() {
  const me = useMe();
  return (
    <RequireRole roles={["college_admin", "registrar"]}>
      <PageHeader title="Academic calendar" description="Semesters and registration periods. Mark one semester as current; open registration to let students enrol." />
      <ResourceManager
        endpoint="/semesters"
        entity="Semester"
        canWrite={me.has("college_admin", "registrar")}
        defaults={{ registrationOpen: false, isCurrent: false }}
        toForm={(s) => ({ ...s, startDate: isoDate(s.startDate), endDate: isoDate(s.endDate) })}
        columns={[
          { key: "name", label: "Semester", render: (s) => <span className="font-medium text-navy-900">{s.name}</span> },
          { key: "academicYear", label: "Academic year" },
          { key: "startDate", label: "Starts", render: (s) => fmtDate(s.startDate) },
          { key: "endDate", label: "Ends", render: (s) => fmtDate(s.endDate) },
          { key: "isCurrent", label: "Current", render: (s) => (s.isCurrent ? <Badge tone="gold">Current</Badge> : "") },
          { key: "registrationOpen", label: "Registration", render: (s) => (s.registrationOpen ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>) },
        ]}
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "e.g. Semester I" },
          { name: "academicYear", label: "Academic year", required: true, placeholder: "e.g. 2026/27" },
          { name: "startDate", label: "Start date", type: "date" },
          { name: "endDate", label: "End date", type: "date" },
          { name: "isCurrent", label: "This is the current semester", type: "checkbox" },
          { name: "registrationOpen", label: "Registration / add-drop open", type: "checkbox" },
        ]}
      />
    </RequireRole>
  );
}
