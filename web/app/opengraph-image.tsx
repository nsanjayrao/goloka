import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// The default social-share card (DESIGN.md #7) for every page that doesn't
// supply its own OG image (watch pages do — the video thumbnail). A branded
// lotus + "Goloka." card so a shared home/browse/channel link never unfurls
// as a bare URL. Generated once at build time.
export const alt = "Goloka — a free index of ISKCON lectures, kirtans, and festivals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The lotus mark rebuilt as a standalone SVG with hardcoded colors (the
// live component uses `currentColor`/`use`/`defs`, which the OG renderer
// handles unreliably — a flat data-URI image is what satori draws cleanly).
const PETAL = "M32,32 Q26,20 32,8 Q38,20 32,32 Z";
function lotusDataUri(): string {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((deg) => `<path d='${PETAL}' transform='rotate(${deg} 32 32)'/>`)
    .join("");
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='150' height='150'>` +
    `<g fill='#1d1d1f'>${petals}</g>` +
    `<circle cx='32' cy='32' r='5' fill='#b97a16'/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function OpengraphImage() {
  // `next build` runs from web/, so cwd is web/ and the font sits at app/.
  // A STATIC single-weight WOFF (not the variable TTF) - satori's font
  // parser can't read variable fonts, and can't decode WOFF2, so plain
  // WOFF is the format that works.
  const fraunces = await readFile(join(process.cwd(), "app/fraunces-og.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          fontFamily: "Fraunces",
        }}
      >
        {/* satori renders the data-URI SVG as an image; eslint's next/image
            rule doesn't apply inside an OG route (this isn't real DOM). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lotusDataUri()} width={150} height={150} alt="" />
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 96,
            fontWeight: 600,
            color: "#1d1d1f",
          }}
        >
          Goloka<span style={{ color: "#b97a16" }}>.</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 30, color: "#6e6e73" }}>
          Eternal abode of divine love
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Fraunces", data: fraunces, style: "normal", weight: 600 }],
    }
  );
}
