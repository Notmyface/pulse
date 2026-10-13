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
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          borderRadius: "28%",
          color: "white",
          fontSize: 280,
          fontWeight: "bold",
        }}
      >
        ⚡
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
