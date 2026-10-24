"use client";

import { useState, type ReactNode } from "react";
import { api, ClientError, download } from "@/lib/client";
import { Button, ErrorBox, useToast } from "./ui";

/** Excel download button that surfaces API errors as toasts. */
export function DownloadButton({ path, children, variant = "secondary", size = "md" }: { path: string; children: ReactNode; variant?: "secondary" | "primary" | "gold" | "ghost"; size?: "sm" | "md" }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Button
      variant={variant}
      size={size}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await download(path);
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      ⬇ {children}
    </Button>
  );
}

/** Upload panel: template download, file picker, upload, and server-side validation messages. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ExcelUpload<T = any>({ endpoint, templatePath, templateLabel = "Download template", onDone, help }: { endpoint: string; templatePath?: string; templateLabel?: string; onDone: (result: T) => void; help?: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<{ message: string; details?: unknown } | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const result = await api<T>(endpoint, { form });
      setFile(null);
      onDone(result);
    } catch (e) {
      setError({ message: (e as Error).message, details: (e as ClientError).details });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {help && <div className="text-sm text-slate-600">{help}</div>}
      {templatePath && (
        <div>
          <DownloadButton path={templatePath}>{templateLabel}</DownloadButton>
        </div>
      )}
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-navy-500">
        <span className="text-2xl">📄</span>
        <span className="text-sm font-medium text-navy-900">{file ? file.name : "Choose an .xlsx file"}</span>
        <span className="text-xs text-slate-500">Excel 2007+ workbook, up to 5 MB</span>
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <ErrorBox message={error?.message} details={error?.details} />
      <div>
        <Button onClick={upload} disabled={!file} loading={busy}>
          ⬆ Upload and validate
        </Button>
      </div>
    </div>
  );
}
