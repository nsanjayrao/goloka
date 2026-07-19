import { describe, expect, it } from "vitest";

import { extractYouTubeId } from "./youtube-url";

describe("extractYouTubeId", () => {
  it("matches a standard watch URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("matches m.youtube.com and other subdomains", () => {
    expect(extractYouTubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("matches a watch URL with extra query params (share tracking)", () => {
    expect(
      extractYouTubeId("https://youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=share")
    ).toBe("dQw4w9WgXcQ");
    // v= not first in the query string
    expect(extractYouTubeId("https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("matches a youtu.be short link", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("matches a youtu.be short link with a trailing query string", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=abc123")).toBe("dQw4w9WgXcQ");
  });

  it("matches a live URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/live/dQw4w9WgXcQ?feature=share")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("matches a shorts URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("finds a URL embedded inside surrounding share text", () => {
    expect(
      extractYouTubeId("Check this out! https://youtu.be/dQw4w9WgXcQ via YouTube")
    ).toBe("dQw4w9WgXcQ");
  });

  it("returns null for plain text with no URL", () => {
    expect(extractYouTubeId("Kirtan tonight at 7pm")).toBeNull();
  });

  it("returns null for a non-YouTube URL, even one with a matching v= param", () => {
    expect(extractYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeId("https://example.com/video/123")).toBeNull();
  });

  it("returns null for null, undefined, and empty string", () => {
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId(undefined)).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
  });

  it("never throws on malformed/garbage input", () => {
    expect(() => extractYouTubeId("%%%not a url at all%%%")).not.toThrow();
    expect(extractYouTubeId("%%%not a url at all%%%")).toBeNull();
    expect(() => extractYouTubeId("youtube.com/watch?v=short")).not.toThrow();
  });

  it("requires a full 11-character ID, not a short fragment", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=short")).toBeNull();
  });
});
