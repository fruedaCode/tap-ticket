import { ImageResponse } from "next/og";

export const alt = "TapTicket — Escanea un ticket, divide la cuenta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand colors from app/globals.css (light theme), converted to hex:
// background oklch(0.971 0.013 17.38) ≈ #faf3f0, primary oklch(0.577 0.215 27.325) ≈ #dc2626.
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        background: "#faf3f0",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "#dc2626" }}>
        TapTicket
      </div>
      <div style={{ display: "flex", fontSize: 44, color: "#1c1917" }}>
        Escanea un ticket, divide la cuenta
      </div>
    </div>,
    { ...size },
  );
}
