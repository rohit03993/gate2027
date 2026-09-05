import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
          fontSize: 160,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        G27
      </div>
    ),
    { width: 512, height: 512 },
  );
}
