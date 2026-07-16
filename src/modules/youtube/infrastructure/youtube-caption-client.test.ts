import { describe, expect, it } from "vitest";

import {
  classifyCaptionSource,
  extractPlayerResponse,
  prioritizeCaptionTracks,
} from "./youtube-caption-client";

describe("extractPlayerResponse", () => {
  it("extracts balanced JSON even when title text contains braces", () => {
    const response = extractPlayerResponse(`
      <script>
        var ytInitialPlayerResponse = {
          "videoDetails": {"title": "A {useful} video", "author": "Teacher"},
          "captions": {"playerCaptionsTracklistRenderer": {"captionTracks": []}}
        };
      </script>
    `);

    expect(response?.videoDetails?.title).toBe("A {useful} video");
  });

  it("returns null when player data is absent", () => {
    expect(extractPlayerResponse("<html></html>")).toBeNull();
  });
});

describe("prioritizeCaptionTracks", () => {
  it("prefers creator-provided English captions over automatic captions", () => {
    const automatic = { languageCode: "en", kind: "asr", label: "automatic" };
    const creatorBritish = { languageCode: "en-GB", label: "creator British" };
    const creatorEnglish = { languageCode: "en", label: "creator English" };

    expect(
      prioritizeCaptionTracks([automatic, creatorBritish, creatorEnglish], "en").map(
        (track) => track.label,
      ),
    ).toEqual(["creator English", "creator British", "automatic"]);
  });

  it("falls back to automatic captions when no creator caption exists", () => {
    expect(prioritizeCaptionTracks([{ languageCode: "en", kind: "asr" }], "en")).toEqual([
      { languageCode: "en", kind: "asr" },
    ]);
  });
});

describe("classifyCaptionSource", () => {
  it("identifies ASR tracks as automatic and all other tracks as creator-provided", () => {
    expect(classifyCaptionSource({ kind: "asr" })).toBe("automatic");
    expect(classifyCaptionSource({})).toBe("creator");
  });
});
