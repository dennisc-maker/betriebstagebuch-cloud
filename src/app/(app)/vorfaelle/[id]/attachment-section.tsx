"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, Download } from "lucide-react";
import { uploadAttachment, deleteAttachment } from "./edit-actions";

type Attachment = {
  id: number;
  filename: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  createdAt: string | Date;
  userName: string | null;
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function AttachmentSection({
  incidentId,
  attachments,
}: {
  incidentId: number;
  attachments: Attachment[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const res = await uploadAttachment(incidentId, formData);
      if (res.error) setError(res.error);
      else router.refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const onDelete = (id: number) => {
    startTransition(async () => {
      await deleteAttachment(id, incidentId);
      router.refresh();
    });
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Paperclip size={16} style={{ color: "var(--ink-500)" }} />
          Anhänge
        </div>
        <div className="card-sub">{attachments.length} Datei(en) · Bilder & PDFs · max 10 MB</div>
      </div>
      {error && (
        <div
          style={{
            padding: "10px 20px",
            background: "var(--sev-critical-bg)",
            color: "var(--sev-critical)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
      <div>
        {attachments.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--ink-500)",
              fontSize: 12,
            }}
          >
            Noch keine Anhänge. Foto vom Schaden hochladen ↓
          </div>
        )}
        {attachments.map((a) => {
          const isImage = a.mimeType.startsWith("image/");
          const Icon = isImage ? ImageIcon : FileText;
          return (
            <div
              key={a.id}
              style={{
                padding: "10px 20px",
                borderBottom: "1px solid var(--hair-soft)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: "var(--surface-2)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={16} style={{ color: "var(--ink-600)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={a.filename}
                >
                  {a.filename}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 2 }}>
                  {formatBytes(a.fileSize)} · {a.userName} · {new Date(a.createdAt).toLocaleString("de-DE")}
                </div>
              </div>
              <a
                href={`/api/uploads/${a.storagePath}`}
                target="_blank"
                rel="noreferrer"
                className="icon-btn"
                title="Öffnen"
                aria-label="Anhang öffnen"
              >
                <Download size={14} />
              </a>
              <button
                onClick={() => onDelete(a.id)}
                disabled={pending}
                className="icon-btn"
                title="Löschen"
                aria-label="Anhang löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 20px", borderTop: "1px solid var(--hair)" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={onFileChange}
          disabled={pending}
          style={{ display: "none" }}
          id={`upload-${incidentId}`}
        />
        <label
          htmlFor={`upload-${incidentId}`}
          className="btn btn-sm"
          style={{ cursor: "pointer" }}
        >
          <Upload size={13} />
          {pending ? "Lädt hoch…" : "Datei hochladen"}
        </label>
        <span style={{ marginLeft: 10, fontSize: 11, color: "var(--ink-500)" }}>
          Bilder vom Schaden, Werkstatt-Berichte, Zustandsfotos
        </span>
      </div>
    </div>
  );
}
