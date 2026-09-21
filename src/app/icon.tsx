import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 90,
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          border: "4px solid #10b981",
        }}
      >
        🏋️‍♂️
      </div>
    ),
    {
      ...size,
    }
  );
}
