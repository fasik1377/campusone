"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, useApi } from "@/lib/client";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Button, cx, Loading, Notice, ToastProvider } from "./ui";

export type Me = {
  user: { id: string; name: string; email?: string; username: string; isSuperAdmin: boolean; mustChangePassword: boolean };
  roles: Role[];
  college: { _id: string; name: string; code: string; status: string; logoFileId?: string; enabledModules: string[] } | null;
  collegeBlocked: boolean;
  colleges: { _id: string; name: string; code: string; status: string }[];
};

type MeContext = Me & { has: (...roles: Role[]) => boolean; module: (key: string) => boolean; reload: () => void };
const Ctx = createContext<MeContext | null>(null);

export function useMe() {
  const me = useContext(Ctx);
  if (!me) throw new Error("useMe must be used inside the portal");
  return me;
}

type NavItem = { href: string; label: string; show: (m: MeContext) => boolean };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { title: "", items: [{ href: "/portal", label: "Dashboard", show: () => true }] },
  {
    title: "Platform",
    items: [
      { href: "/portal/colleges", label: "Colleges", show: (m) => m.user.isSuperAdmin },
      { href: "/portal/audit", label: "Audit log", show: (m) => m.user.isSuperAdmin || m.has("college_admin") },
    ],
  },
  {
    title: "College setup",
    items: [
      { href: "/portal/settings", label: "College settings", show: (m) => m.has("college_admin") },
      { href: "/portal/departments", label: "Departments", show: (m) => m.has("college_admin", "dean", "department_head") },
      { href: "/portal/programs", label: "Programs", show: (m) => m.has("college_admin", "dean", "department_head", "registrar") },
      { href: "/portal/courses", label: "Courses", show: (m) => m.has("college_admin", "dean", "department_head", "registrar") },
      { href: "/portal/semesters", label: "Academic calendar", show: (m) => m.has("college_admin", "registrar") },
      { href: "/portal/sections", label: "Sections & timetable", show: (m) => m.has("college_admin", "department_head", "registrar", "dean") },
      { href: "/portal/staff", label: "Staff accounts", show: (m) => m.has("college_admin") },
    ],
  },
  {
    title: "Academic records",
    items: [
      { href: "/portal/applications", label: "Admissions", show: (m) => m.has("registrar", "admissions_officer", "college_admin") && m.module("admissions") },
      { href: "/portal/students", label: "Students", show: (m) => m.has("registrar", "college_admin", "dean", "department_head") },
      { href: "/portal/registrations", label: "Registrations", show: (m) => m.has("registrar", "department_head", "college_admin") && m.module("registration") },
      { href: "/portal/grade-approvals", label: "Grade approvals", show: (m) => m.has("registrar", "department_head", "dean", "college_admin") && m.module("grading") },
      { href: "/portal/requests", label: "Student requests", show: (m) => m.has("registrar") && m.module("requests") },
      { href: "/portal/reports", label: "Reports & Excel", show: (m) => m.has("registrar", "college_admin") },
    ],
  },
  { title: "Teaching", items: [{ href: "/portal/teaching", label: "My teaching", show: (m) => m.has("instructor") }] },
  { title: "Finance", items: [{ href: "/portal/finance", label: "Invoices & payments", show: (m) => m.has("finance_officer") && m.module("finance") }] },
  {
    title: "My studies",
    items: [
      { href: "/portal/my/registration", label: "Course registration", show: (m) => m.has("student") && m.module("registration") },
      { href: "/portal/my/timetable", label: "Timetable & attendance", show: (m) => m.has("student") },
      { href: "/portal/my/grades", label: "Grades & transcript", show: (m) => m.has("student") },
      { href: "/portal/my/finance", label: "Fees & payments", show: (m) => m.has("student") && m.module("finance") },
      { href: "/portal/my/requests", label: "Service requests", show: (m) => m.has("student") && m.module("requests") },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/portal/announcements", label: "Announcements", show: () => true },
      { href: "/portal/account", label: "My account", show: () => true },
    ],
  },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const { data, error, reload } = useApi<Me>("/auth/me");
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-10">
        <Notice tone="amber">{error}</Notice>
      </div>
    );
  }
  if (!data) return <Loading label="Opening your portal…" />;

  const me: MeContext = {
    ...data,
    has: (...roles) => roles.some((r) => data.roles.includes(r)),
    module: (key) => !data.college || data.college.enabledModules.includes(key),
    reload,
  };

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function switchCollege(collegeId: string) {
    await api("/auth/switch", { body: { collegeId } });
    window.location.href = "/portal";
  }

  const mustChange = data.user.mustChangePassword && pathname !== "/portal/account";
  const roleText = [data.user.isSuperAdmin && "Super Admin", ...data.roles.map((r) => ROLE_LABELS[r])].filter(Boolean).join(" · ");

  const sidebar = (
    <nav className="flex flex-col gap-5 p-4" aria-label="Portal">
      {NAV.map((group) => {
        const items = group.items.filter((i) => i.show(me));
        if (!items.length) return null;
        return (
          <div key={group.title || "main"}>
            {group.title && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy-200/70">{group.title}</p>}
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cx(
                        "block rounded-lg px-3 py-2 text-sm transition-colors",
                        active ? "bg-white/10 font-semibold text-white shadow-[inset_3px_0_0_var(--color-gold-500)]" : "text-navy-100 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <Ctx value={me}>
      <ToastProvider>
        <div className="flex min-h-screen">
          <aside className={cx("no-print fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-navy-900 transition-transform lg:static lg:translate-x-0", menuOpen ? "translate-x-0" : "-translate-x-full")}>
            <Link href="/portal" className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Image src="/logo.png" alt="" width={36} height={36} className="rounded-md bg-white p-0.5" />
              <div>
                <p className="font-bold leading-tight text-white">CampusOne</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gold-500">College Platform</p>
              </div>
            </Link>
            {sidebar}
          </aside>
          {menuOpen && <div className="fixed inset-0 z-30 bg-navy-900/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
              <button className="rounded-lg p-2 text-navy-900 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                ☰
              </button>
              <div className="min-w-0 flex-1">
                {data.colleges.length > 1 ? (
                  <select
                    aria-label="Switch college"
                    value={data.college?._id ?? ""}
                    onChange={(e) => switchCollege(e.target.value)}
                    className="max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-navy-900"
                  >
                    {data.colleges.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="truncate text-sm font-semibold text-navy-900">{data.college ? `${data.college.name} (${data.college.code})` : "Platform administration"}</p>
                )}
                <p className="truncate text-xs text-slate-500">{roleText}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-navy-900">{data.user.name}</p>
                <p className="text-xs text-slate-500">@{data.user.username}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            </header>

            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
              {data.collegeBlocked && (
                <div className="mb-4">
                  <Notice tone="amber">
                    {data.college?.name} is currently {data.college?.status}. College features are unavailable until a platform administrator reactivates it.
                  </Notice>
                </div>
              )}
              {data.college?.status === "pending_setup" && me.has("college_admin") && (
                <div className="mb-4">
                  <Notice>
                    Your college is in <b>setup</b> mode and hidden from the public directory. Configure departments, programs and staff; a platform administrator activates it.
                  </Notice>
                </div>
              )}
              {mustChange ? (
                <div className="mx-auto max-w-lg">
                  <Notice tone="amber">
                    For your security, please replace your temporary password before continuing.{" "}
                    <Link className="font-semibold underline" href="/portal/account">
                      Change password
                    </Link>
                  </Notice>
                </div>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </ToastProvider>
    </Ctx>
  );
}

/** Renders children only for allowed roles; otherwise a polite message. Server APIs enforce the same rules. */
export function RequireRole({ roles, superAdmin, children }: { roles?: Role[]; superAdmin?: boolean; children: ReactNode }) {
  const me = useMe();
  const allowed = (superAdmin && me.user.isSuperAdmin) || (roles && me.has(...roles));
  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <Notice tone="amber">You don&apos;t have access to this page with your current role.</Notice>
      </div>
    );
  }
  return <>{children}</>;
}
