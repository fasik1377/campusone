"use client";

import { useEffect, useState } from "react";
import { RequireRole } from "@/components/portal-shell";
import { Button, Card, Checkbox, ErrorBox, Input, inputClass, Loading, PageHeader, Select, Textarea, useToast } from "@/components/ui";
import { api, useApi } from "@/lib/client";
import type { SiteContent } from "@/lib/site-content";

export default function WebsiteContentPage() {
  const { data, error, loading } = useApi<{ content: SiteContent; defaults: SiteContent }>("/admin/site");
  const colleges = useApi<{ items: { _id: string; name: string; slug: string; status: string }[] }>("/admin/colleges");
  const [c, setC] = useState<SiteContent | null>(null);
  const [words, setWords] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (data) {
      setC(data.content);
      setWords(data.content.rotatingWords.join("\n"));
    }
  }, [data]);

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => setC((s) => (s ? { ...s, [key]: value } : s));

  async function save() {
    if (!c) return;
    setSaving(true);
    setFormError(null);
    try {
      const body = { ...c, rotatingWords: words.split("\n").map((w) => w.trim()).filter(Boolean) };
      const res = await api<{ content: SiteContent }>("/admin/site", { method: "PUT", body });
      setC(res.content);
      toast("Website updated — changes are live");
    } catch (e) {
      setFormError((e as Error).message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireRole superAdmin>
      <PageHeader
        title="Website content"
        description="Edit what visitors see on the public website. Changes go live as soon as you save."
        actions={
          <>
            <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-navy-500 hover:underline">
              View website ↗
            </a>
            <Button onClick={save} loading={saving} disabled={!c}>
              Save changes
            </Button>
          </>
        }
      />
      <ErrorBox message={error ?? formError} />
      {loading && !c && <Loading />}
      {c && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Announcement bar" className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_2fr_1fr] sm:items-end">
              <Checkbox label="Show bar at the top of the website" checked={c.announcementBar.enabled} onChange={(v) => set("announcementBar", { ...c.announcementBar, enabled: v })} />
              <Input label="Message" value={c.announcementBar.text} placeholder="Admissions for 2026/27 are now open!" onChange={(e) => set("announcementBar", { ...c.announcementBar, text: e.target.value })} />
              <Input label="Link (optional)" value={c.announcementBar.link} placeholder="/apply" onChange={(e) => set("announcementBar", { ...c.announcementBar, link: e.target.value })} />
            </div>
          </Card>

          <Card title="Hero (top of the home page)">
            <div className="flex flex-col gap-4">
              <Input label="Small badge text" hint="Leave empty to show live counts of colleges and programs" value={c.heroEyebrow} onChange={(e) => set("heroEyebrow", e.target.value)} />
              {[0, 1, 2].map((i) => (
                <Input
                  key={i}
                  label={`Headline line ${i + 1}${i === 2 ? " (shown in gold)" : ""}`}
                  required
                  value={c.heroTitle[i]}
                  onChange={(e) => {
                    const t = [...c.heroTitle] as SiteContent["heroTitle"];
                    t[i] = e.target.value;
                    set("heroTitle", t);
                  }}
                />
              ))}
              <Textarea label="Sentence before the rotating words" required value={c.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} />
              <Textarea label="Rotating words (one per line)" rows={5} value={words} onChange={(e) => setWords(e.target.value)} />
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card title="Featured college">
              <Select
                label="College highlighted on the home page"
                value={c.featuredCollege ?? ""}
                onChange={(e) => set("featuredCollege", e.target.value || null)}
                options={(colleges.data?.items ?? []).filter((x) => x.status === "active").map((x) => ({ value: x.slug, label: x.name }))}
                placeholder="Automatic (first college with a cover image)"
              />
            </Card>
            <Card title="Call to action (bottom of the home page)">
              <div className="flex flex-col gap-4">
                <Input label="Title" required value={c.ctaTitle} onChange={(e) => set("ctaTitle", e.target.value)} />
                <Textarea label="Text" value={c.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
              </div>
            </Card>
            <Card title="Footer & contact">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Contact email" type="email" value={c.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
                <Input label="Contact phone" value={c.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
                <Input label="Address" className="sm:col-span-2" value={c.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} />
                <Textarea label="Footer description" className="sm:col-span-2" value={c.footerTagline} onChange={(e) => set("footerTagline", e.target.value)} />
              </div>
            </Card>
          </div>

          <Card title={`Frequently asked questions (${c.faqs.length})`} className="xl:col-span-2" actions={<Button size="sm" variant="secondary" onClick={() => set("faqs", [...c.faqs, { q: "", a: "" }])}>+ Add question</Button>}>
            <div className="flex flex-col gap-4">
              {c.faqs.map((f, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_2fr_auto]">
                  <input aria-label="Question" placeholder="Question" className={inputClass} value={f.q} onChange={(e) => set("faqs", c.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                  <textarea aria-label="Answer" placeholder="Answer" rows={2} className={inputClass} value={f.a} onChange={(e) => set("faqs", c.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
                  <div className="flex gap-1 md:flex-col">
                    <button className="rounded px-2 py-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} aria-label="Move up" onClick={() => set("faqs", c.faqs.map((x, j) => (j === i - 1 ? c.faqs[i] : j === i ? c.faqs[i - 1] : x)))}>
                      ↑
                    </button>
                    <button className="rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove question" onClick={() => set("faqs", c.faqs.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {!c.faqs.length && <p className="text-sm text-slate-500">No questions — the FAQ section is hidden on the website.</p>}
            </div>
          </Card>
          <p className="text-sm text-slate-500 xl:col-span-2">
            News on the home page comes from <a className="font-medium text-navy-500 hover:underline" href="/portal/announcements">announcements</a> marked as public.
          </p>
        </div>
      )}
    </RequireRole>
  );
}
