import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
          border: "2px solid #00FF88",
        }}
      >
        <span style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: "20px", fontWeight: 700, color: "#00FF88", lineHeight: 1 }}>
          BH
        </span>
      </div>
    ),
    { ...size }
  );
}
