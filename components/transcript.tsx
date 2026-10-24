"use client";

import { Card, DataTable, Empty } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Transcript = {
  semesters: { semester: string; gpa: number; cgpa: number; courses: { code: string; title: string; credits: number; total?: number; letter?: string; points?: number }[] }[];
  cgpa: number;
  creditsAttempted: number;
  creditsEarned: number;
  standing?: string;
};

/** Published results grouped by semester. Prints cleanly (portal chrome is hidden in print). */
export function TranscriptView({ transcript, student }: { transcript: Transcript; student?: any }) {
  if (!transcript.semesters.length) {
    return (
      <Card>
        <Empty title="No published results yet">Grades appear here after the registrar publishes them.</Empty>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {student && (
        <div className="hidden print:block">
          <h1 className="text-xl font-bold">Unofficial Academic Transcript</h1>
          <p>
            {student.firstName} {student.lastName} · {student.studentId} · {student.program?.name}
          </p>
        </div>
      )}
      {transcript.semesters.map((s) => (
        <Card key={s.semester} title={s.semester} actions={<span className="text-sm text-slate-600">GPA <b className="text-navy-900">{s.gpa.toFixed(2)}</b> · CGPA <b className="text-navy-900">{s.cgpa.toFixed(2)}</b></span>} padded={false}>
          <DataTable
            rowKey={(r: any) => r.code}
            rows={s.courses}
            columns={[
              { key: "code", label: "Code", render: (c: any) => <span className="font-mono">{c.code}</span> },
              { key: "title", label: "Course" },
              { key: "credits", label: "Credits" },
              { key: "total", label: "Total" },
              { key: "letter", label: "Grade", render: (c: any) => <b className={c.letter === "F" ? "text-red-600" : "text-navy-900"}>{c.letter}</b> },
              { key: "points", label: "Points" },
            ]}
          />
        </Card>
      ))}
      <p className="text-sm text-slate-600">
        Credits attempted: <b>{transcript.creditsAttempted}</b> · Credits earned: <b>{transcript.creditsEarned}</b> · Cumulative GPA: <b>{transcript.cgpa.toFixed(2)}</b>
        {transcript.standing && <> · Standing: <b>{transcript.standing}</b></>}
      </p>
    </div>
  );
}
