import { ImageResponse } from "next/og";

/** Binary-chain mark on a solid gradient — readable at Google SERP favicon sizes. */
export function faviconImage(size: number) {
  const radius = Math.round(size * 0.2);
  const iconSize = Math.round(size * 0.62);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #5068e8 0%, #6aa5ff 100%)",
          borderRadius: radius,
        }}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 96 96" fill="none">
          <path
            d="M36 26 18 44a14 14 0 0 0 0 20l3 3a14 14 0 0 0 20 0l18-18"
            stroke="#ffffff"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M60 70 78 52a14 14 0 0 0 0-20l-3-3a14 14 0 0 0-20 0L37 47"
            stroke="#e8f0ff"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M36 26 60 70"
            stroke="#ffffff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity={0.75}
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
