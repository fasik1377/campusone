"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { FormFields, type FieldDef, type Values } from "@/components/resource";
import { Badge, Button, Card, ErrorBox, inputClass, Loading, PageHeader, useToast } from "@/components/ui";
import { api, useApi } from "@/lib/client";
import { MODULE_LABELS, type GradeBand } from "@/lib/roles";

const fields: FieldDef[] = [
  { name: "name", label: "College name", required: true },
  { name: "tagline", label: "Tagline" },
  { name: "email", label: "Contact email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "website", label: "Website" },
  { name: "address", label: "Address" },
  { name: "description", label: "About the college (shown on the public page)", type: "textarea" },
  { name: "timezone", label: "Time zone" },
  { name: "currency", label: "Currency code" },
  { name: "maxCreditsPerSemester", label: "Maximum credits per semester", type: "number" },
  { name: "requireFeeClearance", label: "Block registration when fees are overdue", type: "checkbox" },
];

export default function SettingsPage() {
  const { data, error, loading, reload } = useApi<{ item: Values }>("/college");
  const [values, setValues] = useState<Values>({});
  const [scale, setScale] = useState<GradeBand[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (data?.item) {
      setValues(data.item);
      setScale(data.item.gradingScale ?? []);
    }
  }, [data]);

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      const body = Object.fromEntries(fields.map((f) => [f.name, values[f.name]]));
      await api("/college", { method: "PATCH", body: { ...body, gradingScale: scale } });
      toast("Settings saved");
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    const form = new FormData();
    form.append("file", file);
    try {
      await api("/college/logo", { form });
      toast("Logo updated");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <RequireRole roles={["college_admin"]}>
      <PageHeader title="College settings" description="Profile, branding and academic policy for your college." actions={<Button onClick={save} loading={saving}>Save changes</Button>} />
      <ErrorBox message={error ?? formError} />
      {loading && !data ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card title="Profile & policy" className="xl:col-span-2">
            <FormFields fields={fields} values={values} onChange={(n, v) => setValues((s) => ({ ...s, [n]: v }))} />
          </Card>
          <div className="flex flex-col gap-6">
            <Card title="Logo">
              <div className="flex flex-col items-center gap-3">
                <Image src={values.logoFileId ? `/api/v1/files/${values.logoFileId}` : "/logo.png"} alt="College logo" width={112} height={112} unoptimized className="h-28 w-28 rounded-lg border border-slate-200 object-contain p-2" />
                <label className="cursor-pointer text-sm font-medium text-navy-500 hover:underline">
                  Upload logo
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                </label>
              </div>
            </Card>
            <Card title="Enabled modules">
              <div className="flex flex-wrap gap-1.5">
                {(values.enabledModules ?? []).map((m: keyof typeof MODULE_LABELS) => (
                  <Badge key={m} tone="blue">
                    {MODULE_LABELS[m] ?? m}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Modules are enabled by the platform administrator.</p>
            </Card>
          </div>
          <Card title="Grading scale" className="xl:col-span-3" actions={<Button size="sm" variant="secondary" onClick={() => setScale([...scale, { letter: "", min: 0, points: 0 }])}>+ Add band</Button>}>
            <p className="mb-3 text-sm text-slate-500">Totals are out of 100. A student receives the highest band whose minimum they reach. Include a band starting at 0 (usually F).</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {[...scale].map((band, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex gap-2">
                    <input aria-label="Letter" className={inputClass} value={band.letter} onChange={(e) => setScale(scale.map((b, j) => (j === i ? { ...b, letter: e.target.value } : b)))} />
                    <button className="text-slate-400 hover:text-red-600" onClick={() => setScale(scale.filter((_, j) => j !== i))} aria-label="Remove band">
                      ✕
                    </button>
                  </div>
                  <label className="mt-2 block text-xs text-slate-500">
                    Minimum
                    <input type="number" className={inputClass} value={band.min} onChange={(e) => setScale(scale.map((b, j) => (j === i ? { ...b, min: Number(e.target.value) } : b)))} />
                  </label>
                  <label className="mt-1 block text-xs text-slate-500">
                    Points
                    <input type="number" step="0.25" className={inputClass} value={band.points} onChange={(e) => setScale(scale.map((b, j) => (j === i ? { ...b, points: Number(e.target.value) } : b)))} />
                  </label>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </RequireRole>
  );
}
