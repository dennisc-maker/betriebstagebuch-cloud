"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { addComment, deleteComment } from "./edit-actions";

type Comment = {
  id: number;
  body: string;
  createdAt: string | Date;
  userId: number;
  userName: string | null;
  userRole: string | null;
};

export function CommentSection({
  incidentId,
  comments,
  currentUserId,
}: {
  incidentId: number;
  comments: Comment[];
  currentUserId: number;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      await addComment(incidentId, body);
      setBody("");
      router.refresh();
    });
  };

  const onDelete = (commentId: number) => {
    startTransition(async () => {
      await deleteComment(commentId, incidentId);
      router.refresh();
    });
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MessageSquare size={16} style={{ color: "var(--ink-500)" }} />
          Kommentare
        </div>
        <div className="card-sub">{comments.length} Beiträge · Werkstatt ↔ Disposition</div>
      </div>
      <div>
        {comments.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--ink-500)",
              fontSize: 12,
            }}
          >
            Noch keine Kommentare. Ersten Beitrag schreiben unten ↓
          </div>
        )}
        {comments.map((c) => {
          const initials = (c.userName ?? "??")
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div
              key={c.id}
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid var(--hair-soft)",
                display: "flex",
                gap: 10,
              }}
            >
              <div className="avatar" style={{ flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.userName}</span>
                  {c.userRole && (
                    <span className="pill pill-neutral" style={{ fontSize: 10 }}>
                      {c.userRole === "betriebsleiter"
                        ? "Betriebsleiter"
                        : c.userRole === "werkstatt"
                          ? "Werkstatt"
                          : c.userRole === "disponent"
                            ? "Disponent"
                            : c.userRole}
                    </span>
                  )}
                  <span className="code" style={{ fontSize: 10.5, color: "var(--ink-500)" }}>
                    {new Date(c.createdAt).toLocaleString("de-DE")}
                  </span>
                  {c.userId === currentUserId && (
                    <button
                      onClick={() => onDelete(c.id)}
                      disabled={pending}
                      className="icon-btn"
                      style={{ marginLeft: "auto", width: 20, height: 20 }}
                      title="Kommentar löschen"
                      aria-label="Kommentar löschen"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={submit}
        style={{ padding: "12px 20px", borderTop: "1px solid var(--hair)", display: "flex", gap: 8 }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Kommentar hinzufügen… (Werkstatt sieht es sofort)"
          rows={2}
          className="textarea"
          style={{ minHeight: 50, flex: 1 }}
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="btn btn-accent"
          style={{ alignSelf: "flex-end" }}
        >
          <Send size={14} />
          Senden
        </button>
      </form>
    </div>
  );
}
