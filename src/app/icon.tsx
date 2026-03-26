import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

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
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.12), transparent 42%), linear-gradient(180deg, #1a2434 0%, #0b1627 100%)",
          borderRadius: 18,
          border: "1px solid rgba(201,168,107,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 46,
            height: 46,
            borderRadius: 16,
            background:
              "linear-gradient(180deg, rgba(201,168,107,0.28) 0%, rgba(201,168,107,0.14) 100%)",
            color: "#f2dfbc",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.08em",
          }}
        >
          Hx
        </div>
      </div>
    ),
    size,
  );
}
