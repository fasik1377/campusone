"use client";

import Link from "next/link";
import { useState } from "react";
import { RequireRole, useMe } from "@/components/portal-shell";
import { ResourceManager, useOptions } from "@/components/resource";
import { Button, inputClass, PageHeader, Select, StatusBadge } from "@/components/ui";
import { DAYS, DEFAULT_ASSESSMENTS } from "@/lib/roles";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Slot = { day: string; start: string; end: string; room?: string };
type Assessment = { name: string; weight: number };

const courseLabel = (c: any) => `${c.code} — ${c.title}`;
const semesterLabel = (s: any) => `${s.name} ${s.academicYear}${s.isCurrent ? " (current)" : ""}`;
const userLabel = (u: any) => u.name;

function ScheduleEditor({ value, onChange }: { value: Slot[]; onChange: (v: Slot[]) => void }) {
  const slots = value ?? [];
  const update = (i: number, patch: Partial<Slot>) => onChange(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-navy-900">Weekly timetable</legend>
      <div className="flex flex-col gap-2">
        {slots.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1.3fr_auto] gap-2">
            <select aria-label="Day" className={inputClass} value={s.day} onChange={(e) => update(i, { day: e.target.value })}>
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input aria-label="Start" type="time" className={inputClass} value={s.start} onChange={(e) => update(i, { start: e.target.value })} />
            <input aria-label="End" type="time" className={inputClass} value={s.end} onChange={(e) => update(i, { end: e.target.value })} />
            <input aria-label="Room" placeholder="Room" className={inputClass} value={s.room ?? ""} onChange={(e) => update(i, { room: e.target.value })} />
            <button type="button" className="px-2 text-slate-400 hover:text-red-600" onClick={() => onChange(slots.filter((_, j) => j !== i))} aria-label="Remove">
              ✕
            </button>
          </div>
        ))}
        <div>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...slots, { day: "Mon", start: "08:00", end: "10:00", room: "" }])}>
            + Add class time
          </Button>
        </div>
        <p className="text-xs text-slate-500">Room and instructor clashes in the same semester are rejected automatically.</p>
      </div>
    </fieldset>
  );
}

function AssessmentEditor({ value, onChange }: { value: Assessment[]; onChange: (v: Assessment[]) => void }) {
  const items = value ?? [];
  const total = items.reduce((s, a) => s + Number(a.weight || 0), 0);
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-navy-900">Assessment components (weights must total 100)</legend>
      <div className="flex flex-col gap-2">
        {items.map((a, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_auto] gap-2">
            <input aria-label="Component" className={inputClass} value={a.name} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input aria-label="Weight" type="number" className={inputClass} value={a.weight} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)))} />
            <button type="button" className="px-2 text-slate-400 hover:text-red-600" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
              ✕
            </button>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...items, { name: "", weight: 0 }])}>
            + Add component
          </Button>
          <span className={total === 100 ? "text-xs text-emerald-700" : "text-xs text-red-600"}>Total: {total}</span>
        </div>
      </div>
    </fieldset>
  );
}

export default function SectionsPage() {
  const me = useMe();
  const [semester, setSemester] = useState("");
  const courses = useOptions("/courses", courseLabel);
  const semesters = useOptions("/semesters", semesterLabel);
  const instructors = useOptions("/staff?role=instructor", userLabel);

  return (
    <RequireRole roles={["college_admin", "department_head", "registrar", "dean"]}>
      <PageHeader title="Sections & timetable" description="Offer courses for a semester, set capacity, assign instructors, and schedule rooms." />
      <div className="mb-4 max-w-xs">
        <Select label="Semester" value={semester} onChange={(e) => setSemester(e.target.value)} options={semesters} placeholder="All semesters" />
      </div>
      <ResourceManager
        endpoint="/sections"
        query={semester ? `semester=${semester}` : ""}
        entity="Section"
        canWrite={me.has("college_admin", "department_head", "registrar")}
        defaults={{ name: "A", capacity: 40, schedule: [], assessments: DEFAULT_ASSESSMENTS, semester }}
        toForm={(s) => ({ ...s, course: s.course?._id, semester: s.semester?._id, instructor: s.instructor?._id ?? "" })}
        toBody={(v) => ({ course: v.course, semester: v.semester, name: v.name, instructor: v.instructor, capacity: v.capacity, schedule: v.schedule, assessments: v.assessments })}
        searchKeys={["course.code", "course.title", "instructor.name", "name"]}
        columns={[
          { key: "course", label: "Course", render: (s) => <span className="font-medium text-navy-900">{s.course?.code} <span className="font-normal text-slate-500">{s.course?.title}</span></span> },
          { key: "name", label: "Sec." },
          { key: "semester", label: "Semester", render: (s) => `${s.semester?.name} ${s.semester?.academicYear}` },
          { key: "instructor", label: "Instructor", render: (s) => s.instructor?.name ?? <span className="text-amber-700">Unassigned</span> },
          { key: "schedule", label: "Timetable", render: (s) => (s.schedule ?? []).map((x: Slot) => `${x.day} ${x.start}-${x.end}${x.room ? ` (${x.room})` : ""}`).join(", ") || "—" },
          { key: "capacity", label: "Cap." },
          { key: "gradeStatus", label: "Grades", render: (s) => <StatusBadge status={s.gradeStatus} /> },
        ]}
        rowActions={(s) => (
          <Link href={`/portal/teaching/${s._id}`} className="px-2 text-sm text-navy-500 hover:underline">
            Open
          </Link>
        )}
        fields={[
          { name: "course", label: "Course", type: "select", options: courses, required: true },
          { name: "semester", label: "Semester", type: "select", options: semesters, required: true },
          { name: "name", label: "Section name", required: true },
          { name: "capacity", label: "Capacity", type: "number", required: true },
          { name: "instructor", label: "Instructor", type: "select", options: instructors, placeholder: "Unassigned", full: true },
          { name: "schedule", label: "Schedule", type: "custom", render: (v, set) => <ScheduleEditor value={v} onChange={set} /> },
          { name: "assessments", label: "Assessments", type: "custom", render: (v, set) => <AssessmentEditor value={v} onChange={set} /> },
        ]}
      />
    </RequireRole>
  );
}
