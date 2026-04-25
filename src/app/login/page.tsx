import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="login-shell">
      <div className="login-art">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(255,255,255,0.08)",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "-0.02em",
            }}
          >
            NVB
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              Betriebs<span style={{ color: "var(--accent)" }}>tagebuch</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, letterSpacing: "0.04em" }}>
              NVB BIRKENFELD GMBH
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 480 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 38,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Disponenten-<br />Betriebstagebuch.
          </h1>
          <p
            style={{
              fontSize: 14,
              opacity: 0.75,
              marginTop: 16,
              maxWidth: 380,
              lineHeight: 1.5,
            }}
          >
            Disporelevante Aktionen erfassen, Tagesberichte und Monatsanalysen für die
            Nahverkehrsbetriebe Birkenfeld GmbH.
          </p>
        </div>

        <div style={{ fontSize: 11.5, opacity: 0.55, letterSpacing: "0.04em" }}>
          NAHVERKEHRSBETRIEBE BIRKENFELD GMBH · IDAR-OBERSTEIN
        </div>

        <svg
          style={{ position: "absolute", right: -40, top: 80, opacity: 0.06 }}
          width="420"
          height="420"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {[...Array(11)].map((_, i) => (
            <line
              key={"v" + i}
              x1={i * 10}
              y1="0"
              x2={i * 10}
              y2="100"
              stroke="white"
              strokeWidth=".25"
            />
          ))}
          {[...Array(11)].map((_, i) => (
            <line
              key={"h" + i}
              x1="0"
              y1={i * 10}
              x2="100"
              y2={i * 10}
              stroke="white"
              strokeWidth=".25"
            />
          ))}
          <circle cx="50" cy="50" r="32" fill="none" stroke="var(--accent)" strokeWidth=".5" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="var(--accent)" strokeWidth=".5" />
          <circle cx="50" cy="50" r="2" fill="var(--accent)" />
        </svg>
      </div>

      <div className="login-form-side">
        <LoginForm />
      </div>
    </div>
  );
}
