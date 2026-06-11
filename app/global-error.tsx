"use client";

// Fallback for errors thrown in the root layout itself. Must render <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0a0a0b",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#8a8a93" }}>Please reload the page.</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: "#c6ff3a",
              color: "#0a0a0b",
              border: 0,
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
