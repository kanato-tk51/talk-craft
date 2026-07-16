import { fetchTranscript } from "youtube-transcript";

import {
  extractYouTubeVideoId,
  type FetchedYoutubeTranscript,
  MAX_TRANSCRIPT_CHARACTERS,
  type YoutubeCaptionSource,
} from "../domain/youtube-material";

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string; runs?: Array<{ text?: string }> };
};

type PlayerResponse = {
  playabilityStatus?: { status?: string; reason?: string };
  videoDetails?: {
    title?: string;
    author?: string;
    thumbnail?: { thumbnails?: Array<{ url?: string }> };
  };
  captions?: {
    playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
  };
};

export type YoutubeTranscriptErrorCode =
  | "invalid_url"
  | "video_unavailable"
  | "captions_unavailable"
  | "english_captions_unavailable"
  | "caption_download_failed"
  | "transcript_too_long";

export class YoutubeTranscriptError extends Error {
  constructor(
    public readonly code: YoutubeTranscriptErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "YoutubeTranscriptError";
  }
}

export async function fetchEnglishYoutubeTranscript(
  inputUrl: string,
): Promise<FetchedYoutubeTranscript> {
  const youtubeVideoId = extractYouTubeVideoId(inputUrl);
  if (!youtubeVideoId) {
    throw new YoutubeTranscriptError("invalid_url", "有効なYouTube動画のURLを入力してください。");
  }

  const sourceUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  let watchResponse: Response;
  try {
    watchResponse = await fetch(`${sourceUrl}&hl=en`, {
      cache: "no-store",
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new YoutubeTranscriptError(
      "video_unavailable",
      "YouTubeに接続できませんでした。少し待ってから再度お試しください。",
    );
  }

  if (!watchResponse.ok) {
    throw new YoutubeTranscriptError(
      "video_unavailable",
      "動画情報を取得できませんでした。公開動画のURLか確認してください。",
    );
  }

  const html = await watchResponse.text();
  const playerResponse = extractPlayerResponse(html);
  if (!playerResponse?.videoDetails) {
    throw new YoutubeTranscriptError(
      "video_unavailable",
      playerResponse?.playabilityStatus?.reason ||
        "動画情報を取得できませんでした。年齢制限・地域制限・非公開設定をご確認ください。",
    );
  }

  const captionTracks =
    playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (!captionTracks.length) {
    throw new YoutubeTranscriptError(
      "captions_unavailable",
      "この動画には取得できる字幕がありません。字幕付きの動画をお試しください。",
    );
  }

  const englishTracks = captionTracks.filter((track) =>
    track.languageCode?.toLowerCase().startsWith("en"),
  );
  const selectedTrack = prioritizeCaptionTracks(englishTracks, "en")[0];

  if (!selectedTrack?.baseUrl || !selectedTrack.languageCode) {
    const languages = [
      ...new Set(captionTracks.map((track) => track.languageCode).filter(Boolean)),
    ];
    throw new YoutubeTranscriptError(
      "english_captions_unavailable",
      `英語字幕が見つかりませんでした。利用可能な言語: ${languages.join(", ") || "不明"}`,
    );
  }

  let downloadedTranscript: Awaited<ReturnType<typeof fetchTranscript>>;
  try {
    downloadedTranscript = await fetchTranscript(youtubeVideoId, {
      lang: selectedTrack.languageCode,
      fetch: (input, init) =>
        fetchWithManualCaptionPriority(selectedTrack.languageCode ?? "en", input, init),
    });
  } catch {
    throw new YoutubeTranscriptError(
      "caption_download_failed",
      "英語字幕のダウンロードに失敗しました。少し待ってから再度お試しください。",
    );
  }

  const scale = transcriptUsesMilliseconds(downloadedTranscript) ? 1 : 1_000;
  const cues = downloadedTranscript.map((item) => ({
    startMs: Math.round(item.offset * scale),
    durationMs: Math.round(item.duration * scale),
    text: item.text,
  }));
  if (!cues.length) {
    throw new YoutubeTranscriptError(
      "caption_download_failed",
      "字幕データが空でした。YouTube側で一時的に取得が制限されている可能性があります。",
    );
  }

  const transcriptLength = cues.reduce((total, cue) => total + cue.text.length, 0);
  if (transcriptLength > MAX_TRANSCRIPT_CHARACTERS) {
    throw new YoutubeTranscriptError(
      "transcript_too_long",
      "字幕が長すぎます。現在は約20万文字までの動画に対応しています。",
    );
  }

  const details = playerResponse.videoDetails;
  const thumbnails = details.thumbnail?.thumbnails ?? [];
  return {
    youtubeVideoId,
    sourceUrl,
    title: details.title?.trim() || "YouTube動画",
    channelName: details.author?.trim() || "",
    thumbnailUrl:
      thumbnails.at(-1)?.url || `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
    captionLanguageCode: selectedTrack.languageCode,
    captionTrackName: captionTrackName(selectedTrack),
    captionSource: classifyCaptionSource(selectedTrack),
    cues,
  };
}

export function prioritizeCaptionTracks<Track extends Pick<CaptionTrack, "kind" | "languageCode">>(
  tracks: Track[],
  preferredLanguage = "en",
): Track[] {
  return [...tracks].sort((left, right) => {
    const leftAuto = left.kind === "asr" ? 1 : 0;
    const rightAuto = right.kind === "asr" ? 1 : 0;
    const leftExact = left.languageCode === preferredLanguage ? 0 : 1;
    const rightExact = right.languageCode === preferredLanguage ? 0 : 1;
    return leftAuto - rightAuto || leftExact - rightExact;
  });
}

export function classifyCaptionSource(track: Pick<CaptionTrack, "kind">): YoutubeCaptionSource {
  return track.kind === "asr" ? "automatic" : "creator";
}

export function extractPlayerResponse(html: string): PlayerResponse | null {
  const markers = ["ytInitialPlayerResponse =", "var ytInitialPlayerResponse ="];
  for (const marker of markers) {
    const markerIndex = html.indexOf(marker);
    if (markerIndex < 0) continue;
    const jsonText = extractBalancedObject(html, markerIndex + marker.length);
    if (!jsonText) continue;
    try {
      return JSON.parse(jsonText) as PlayerResponse;
    } catch {
      // Keep looking in case a later marker contains a complete response.
    }
  }
  return null;
}

function extractBalancedObject(value: string, fromIndex: number): string | null {
  const start = value.indexOf("{", fromIndex);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }
  return null;
}

function transcriptUsesMilliseconds(
  transcript: Awaited<ReturnType<typeof fetchTranscript>>,
): boolean {
  const durations = transcript
    .map((item) => item.duration)
    .filter((duration) => Number.isFinite(duration) && duration > 0)
    .sort((left, right) => left - right);
  const median = durations[Math.floor(durations.length / 2)] ?? 0;
  return median > 100;
}

async function fetchWithManualCaptionPriority(
  preferredLanguage: string,
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });

  const requestUrl =
    typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (!requestUrl.includes("/youtubei/v1/player") || !response.ok) {
    return response;
  }

  const responseBody = await response.text();
  try {
    const playerData = JSON.parse(responseBody) as PlayerResponse;
    const tracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks?.length) {
      playerData.captions = {
        playerCaptionsTracklistRenderer: {
          ...playerData.captions?.playerCaptionsTracklistRenderer,
          captionTracks: prioritizeCaptionTracks(tracks, preferredLanguage),
        },
      };
    }
    return new Response(JSON.stringify(playerData), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}

function captionTrackName(track: CaptionTrack): string {
  const name = track.name?.simpleText ?? track.name?.runs?.map((run) => run.text ?? "").join("");
  return name?.trim() || track.languageCode || "English";
}
