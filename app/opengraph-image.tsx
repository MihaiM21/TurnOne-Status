import { ImageResponse } from "next/og";

export const alt = "Turn One Status";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#020202",
          color: "#F8F8F8",
          borderLeft: "12px solid #D40924",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24">
          <path d="M8 3h14l-6 18H2z" fill="#D40924" />
          <path d="M12.2 3 6.4 21h2.6L14.8 3z" fill="#020202" />
        </svg>
        <div
          style={{
            marginTop: 40,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: 8,
            display: "flex",
          }}
        >
          TURN ONE STATUS
        </div>
        <div style={{ marginTop: 20, fontSize: 32, color: "#868686", display: "flex" }}>
          Sim racing, F1 live timing, web app and API. Live.
        </div>
      </div>
    ),
    size,
  );
}
