import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4d7c6f",
          color: "white",
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        G27
      </div>
    ),
    { ...size },
  );
}
