import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        G27
      </div>
    ),
    { ...size },
  );
}
