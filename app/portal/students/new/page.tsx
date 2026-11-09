"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { RequireRole, useMe } from "@/components/portal-shell";
import { useOptions } from "@/components/resource";
import { Button, Card, Checkbox, cx, DescriptionList, ErrorBox, Input, Notice, PageHeader, Select, Textarea, useToast } from "@/components/ui";
import { api, fmtDate, useApi } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const STEPS = ["Personal details", "Academic placement", "Login account", "Review"] as const;
const programLabel = (p: any) => `${p.code} — ${p.name}`;

const EMPTY = {
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  program: "",
  cohort: String(new Date().getFullYear()),
  studyMode: "Regular",
  studentId: "",
  loginMode: "auto" as "auto" | "custom",
  username: "",
  password: "",
  mustChangePassword: true,
};

type Check = { matches: any[]; emailTaken: boolean; usernameTaken: boolean; studentIdTaken: boolean; nextStudentId: string };
type Created = { studentId: string; username: string; password: string; id: string; name: string; program: string };

export default function NewStudentPage() {
  const me = useMe();
  const [step, setStep] = useState(0);
  const [v, setV] = useState(EMPTY);
  const [check, setCheck] = useState<Check | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const programs = useOptions("/programs", programLabel);
  const programList = useApi<{ items: any[] }>("/programs");
  const toast = useToast();
  const set = (k: keyof typeof EMPTY, value: unknown) => setV((s) => ({ ...s, [k]: value }));

  // Live duplicate / availability check, debounced while typing.
  useEffect(() => {
    const params = new URLSearchParams();
    for (const k of ["firstName", "lastName", "dateOfBirth", "email", "studentId"] as const) if (v[k]) params.set(k, v[k]);
    if (v.loginMode === "custom" && v.username) params.set("username", v.username);
    const t = setTimeout(() => {
      api<Check>(`/students/check?${params}`).then(setCheck).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [v.firstName, v.lastName, v.dateOfBirth, v.email, v.studentId, v.username, v.loginMode]);

  const program = useMemo(() => programList.data?.items.find((p) => p._id === v.program), [programList.data, v.program]);
  const plannedId = v.studentId.trim() || check?.nextStudentId || "—";
  const plannedUsername = v.loginMode === "custom" ? v.username.trim().toLowerCase() : plannedId.toLowerCase();

  const problems: string[][] = [
    [
      !v.firstName.trim() && "Enter the first name.",
      !v.lastName.trim() && "Enter the last name.",
      v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) && "Enter a valid email or leave it empty.",
      check?.emailTaken && "This email already belongs to an account.",
    ].filter(Boolean) as string[],
    [!v.program && "Choose a program.", check?.studentIdTaken && "That student ID is already used."].filter(Boolean) as string[],
    v.loginMode === "custom"
      ? ([
          !/^[a-z0-9._@-]{3,80}$/i.test(v.username.trim()) && "Usernames are 3+ characters: letters, numbers, dot, dash, underscore or @.",
          check?.usernameTaken && "That username is taken.",
          !(v.password.length >= 8 && /[a-z]/i.test(v.password) && /\d/.test(v.password)) && "Password needs 8+ characters with a letter and a number.",
        ].filter(Boolean) as string[])
      : [],
    [],
  ];

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        firstName: v.firstName,
        lastName: v.lastName,
        gender: v.gender,
        dateOfBirth: v.dateOfBirth,
        email: v.email,
        phone: v.phone,
        address: v.address,
        emergencyContactName: v.emergencyContactName,
        emergencyContactPhone: v.emergencyContactPhone,
        program: v.program,
        cohort: v.cohort,
        studyMode: v.studyMode,
        studentId: v.studentId,
      };
      if (v.loginMode === "custom") Object.assign(body, { username: v.username, password: v.password, mustChangePassword: v.mustChangePassword });
      const res = await api("/students", { body });
      setCreated({ ...res.credentials, id: res.item._id, name: `${v.firstName} ${v.lastName}`, program: program ? `${program.name}` : "" });
      toast("Student added");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <RequireRole roles={["registrar"]}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl">
          <Card>
            <div className="flex flex-col items-center gap-2 text-center">
              <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" className="h-7 w-7" />
              </motion.div>
              <h1 className="text-xl font-bold text-navy-900">{created.name} is now a student</h1>
              <p className="text-sm text-slate-600">{created.program}</p>
            </div>
            {/* Printable sign-in slip */}
            <div className="print-slip mt-6 rounded-2xl border-2 border-dashed border-navy-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{me.college?.name} · Portal sign-in</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-sm">
                <dt className="text-slate-500">Student ID</dt>
                <dd className="font-semibold text-navy-900">{created.studentId}</dd>
                <dt className="text-slate-500">Username</dt>
                <dd className="font-semibold text-navy-900">{created.username}</dd>
                <dt className="text-slate-500">Password</dt>
                <dd className="font-semibold text-navy-900">{created.password}</dd>
              </dl>
              <p className="mt-3 text-xs text-slate-500">Sign in at the college page. You will be asked to choose your own password.</p>
            </div>
            <div className="no-print mt-6 flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(`Student ID: ${created.studentId}\nUsername: ${created.username}\nPassword: ${created.password}`);
                  toast("Copied to clipboard");
                }}
              >
                Copy details
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                Print slip
              </Button>
              <Link href={`/portal/students/${created.id}`} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-slate-50">
                Open record
              </Link>
              <Button
                onClick={() => {
                  setCreated(null);
                  setV({ ...EMPTY, program: v.program, cohort: v.cohort, studyMode: v.studyMode });
                  setStep(0);
                }}
              >
                + Add another
              </Button>
            </div>
          </Card>
        </motion.div>
      </RequireRole>
    );
  }

  return (
    <RequireRole roles={["registrar"]}>
      <PageHeader back={{ href: "/portal/students", label: "Students" }} title="Add a student" description="Create the official student record and the student's portal login in one go." />

      {/* Stepper */}
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              disabled={i > step && problems.slice(0, i).some((p) => p.length)}
              onClick={() => setStep(i)}
              className={cx("flex w-full flex-col gap-2 text-left disabled:cursor-not-allowed", i <= step ? "text-navy-900" : "text-slate-400")}
            >
              <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <motion.span className="block h-full bg-gold-500" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </span>
              <span className="text-xs font-semibold sm:text-sm">
                <span className="mr-1 text-slate-400">{i + 1}.</span>
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              {step === 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="First name" required autoFocus value={v.firstName} onChange={(e) => set("firstName", e.target.value)} />
                  <Input label="Last name" required value={v.lastName} onChange={(e) => set("lastName", e.target.value)} />
                  <Select label="Gender" value={v.gender} onChange={(e) => set("gender", e.target.value)} options={[{ value: "Female", label: "Female" }, { value: "Male", label: "Male" }]} placeholder="Select…" />
                  <Input label="Date of birth" type="date" value={v.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
                  <Input label="Email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} hint="Optional — the student can also sign in with it" />
                  <Input label="Phone" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
                  <Textarea label="Address" className="sm:col-span-2" rows={2} value={v.address} onChange={(e) => set("address", e.target.value)} />
                  <Input label="Emergency contact name" value={v.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
                  <Input label="Emergency contact phone" value={v.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} />
                </div>
              )}
              {step === 1 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select className="sm:col-span-2" label="Program" required value={v.program} onChange={(e) => set("program", e.target.value)} options={programs} placeholder="Choose a program…" />
                  {program && (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 sm:col-span-2">
                      <b className="text-navy-900">{program.department?.name}</b> · {program.level} · {program.durationYears} years · {program.totalCredits} credits
                    </div>
                  )}
                  <Input label="Cohort / intake year" value={v.cohort} onChange={(e) => set("cohort", e.target.value)} />
                  <Select label="Study mode" value={v.studyMode} onChange={(e) => set("studyMode", e.target.value)} options={["Regular", "Extension", "Distance", "Summer"].map((m) => ({ value: m, label: m }))} />
                  <Input
                    className="sm:col-span-2"
                    label="Student ID"
                    value={v.studentId}
                    onChange={(e) => set("studentId", e.target.value)}
                    hint={`Leave empty to use the next automatic ID${check?.nextStudentId ? `: ${check.nextStudentId}` : ""}`}
                  />
                </div>
              )}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Login">
                    {(
                      [
                        ["auto", "Generate automatically", `Username = student ID (${plannedId.toLowerCase()}) and a random temporary password.`],
                        ["custom", "Choose username & password", "Set the login yourself, e.g. when handing it over in person."],
                      ] as const
                    ).map(([mode, title, text]) => (
                      <button
                        key={mode}
                        role="radio"
                        aria-checked={v.loginMode === mode}
                        onClick={() => set("loginMode", mode)}
                        className={cx("rounded-xl border-2 p-4 text-left transition", v.loginMode === mode ? "border-navy-900 bg-navy-50/50" : "border-slate-200 hover:border-slate-300")}
                      >
                        <p className="font-semibold text-navy-900">{title}</p>
                        <p className="mt-1 text-xs text-slate-500">{text}</p>
                      </button>
                    ))}
                  </div>
                  {v.loginMode === "custom" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input label="Username" required value={v.username} onChange={(e) => set("username", e.target.value)} />
                      <Input label="Password" type="text" required value={v.password} onChange={(e) => set("password", e.target.value)} hint="8+ characters with a letter and a number" />
                      <div className="sm:col-span-2">
                        <Checkbox label="Ask the student to choose their own password at first sign-in" checked={v.mustChangePassword} onChange={(c) => set("mustChangePassword", c)} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="flex flex-col gap-5">
                  <DescriptionList
                    items={[
                      ["Name", `${v.firstName} ${v.lastName}`],
                      ["Gender", v.gender],
                      ["Date of birth", v.dateOfBirth ? fmtDate(v.dateOfBirth) : ""],
                      ["Email", v.email],
                      ["Phone", v.phone],
                      ["Emergency contact", [v.emergencyContactName, v.emergencyContactPhone].filter(Boolean).join(" · ")],
                      ["Program", program ? `${program.name} (${program.code})` : ""],
                      ["Cohort · mode", `${v.cohort} · ${v.studyMode}`],
                      ["Student ID", plannedId],
                      ["Username", plannedUsername],
                    ]}
                  />
                  <ErrorBox message={error} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {!!problems[step].length && step < 3 && (
            <ul className="mt-4 list-disc pl-5 text-sm text-amber-800">
              {problems[step].map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex justify-between gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step < 3 ? (
              <Button disabled={!!problems[step].length} onClick={() => setStep((s) => s + 1)}>
                Continue
              </Button>
            ) : (
              <Button variant="gold" loading={saving} disabled={problems.some((p) => p.length)} onClick={submit}>
                Create student
              </Button>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Preview">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500 text-lg font-bold text-navy-900">
                {`${v.firstName[0] ?? "?"}${v.lastName[0] ?? ""}`.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-900">{`${v.firstName} ${v.lastName}`.trim() || "New student"}</p>
                <p className="font-mono text-xs text-slate-500">{plannedId}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{program?.name ?? "No program chosen yet"}</p>
          </Card>
          {!!check?.matches.length && (
            <Notice tone="amber">
              <p className="font-semibold">Possible duplicate</p>
              <ul className="mt-1 flex flex-col gap-1">
                {check.matches.map((m) => (
                  <li key={m._id}>
                    <Link href={`/portal/students/${m._id}`} className="underline" target="_blank">
                      {m.studentId} · {m.firstName} {m.lastName}
                    </Link>{" "}
                    ({m.program?.code}, {m.status})
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs">Check these before creating a second record for the same person.</p>
            </Notice>
          )}
          <Card>
            <p className="text-sm text-slate-600">Adding many students at once?</p>
            <Link href="/portal/students" className="mt-1 inline-flex text-sm font-semibold text-navy-600 hover:underline">
              Use Import from Excel →
            </Link>
          </Card>
        </div>
      </div>
    </RequireRole>
  );
}
