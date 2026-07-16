import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { scheduleYoutubeGeneration } from "@/modules/youtube/application/youtube-background-generation";
import { getYoutubeMaterial } from "@/modules/youtube/application/youtube-service";
import { AnnotatedTranscript } from "@/modules/youtube/ui/annotated-transcript";
import { DeleteYoutubeMaterialButton } from "@/modules/youtube/ui/delete-youtube-material-button";
import { TranslationMethodSelector } from "@/modules/youtube/ui/translation-method-selector";

export const metadata: Metadata = { title: "YouTube教材" };
export const dynamic = "force-dynamic";
export const maxDuration = 1800;

function timestamp(startMs: number): string {
  const totalSeconds = Math.floor(startMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default async function YoutubeMaterialDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ materialId: string }>;
  searchParams: Promise<{ generation?: string | string[]; method?: string | string[] }>;
}) {
  const { materialId } = await params;
  const query = await searchParams;
  if (!z.uuid().safeParse(materialId).success) notFound();

  const material = await getYoutubeMaterial(materialId);
  if (!material) notFound();

  const translated = material.translatedAt !== null;
  const generationActive = ["queued", "structuring", "translating"].includes(
    material.generationStatus,
  );
  if (!translated && generationActive) scheduleYoutubeGeneration(material.id);

  return (
    <div className="page-shell detail-shell youtube-detail-shell">
      <Link className="back-link" href="/youtube">
        ← YouTube教材一覧
      </Link>

      <section className="youtube-hero">
        <div className="youtube-player">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${material.youtubeVideoId}`}
            title={`${material.title} を再生`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <div>
          <div className="eyebrow">YOUTUBE MATERIAL</div>
          <h1>{material.title}</h1>
          <p>{material.channelName || "チャンネル名不明"}</p>
          <div className="video-detail-actions">
            <a className="text-action" href={material.sourceUrl} target="_blank" rel="noreferrer">
              YouTubeで動画を見る ↗
            </a>
            <DeleteYoutubeMaterialButton materialId={material.id} title={material.title} />
          </div>
        </div>
      </section>

      <div className="session-facts youtube-facts">
        <div>
          <span>字幕</span>
          <b>{material.captionTrackName}</b>
        </div>
        <div>
          <span>原文ブロック</span>
          <b>{material.transcriptBlocks.length}件</b>
        </div>
        <div>
          <span>翻訳状態</span>
          <b>
            {translated
              ? "自動生成済み"
              : material.generationStatus === "failed"
                ? `生成中断（${material.translationBlocks.length}段落保存済み）`
                : material.generationStatus === "manual"
                  ? "ChatGPTの回答待ち"
                  : material.generationStatus === "queued"
                    ? "バックグラウンド処理の開始待ち"
                    : material.generationStatus === "structuring"
                      ? "段落構成を分析中"
                      : material.generationStatus === "translating"
                        ? `生成途中（${material.translationBlocks.length}段落保存済み）`
                        : "自動生成待ち"}
          </b>
        </div>
      </div>

      {translated ? (
        <>
          <section className="material-summary">
            <div className="eyebrow">SUMMARY</div>
            <h2>動画の要点</h2>
            <p>{material.summaryJa}</p>
          </section>

          <AnnotatedTranscript
            materialId={material.id}
            transcriptBlocks={material.transcriptBlocks}
            translationBlocks={material.translationBlocks}
            keyExpressions={material.keyExpressions}
            sourceUrl={material.sourceUrl}
          />
        </>
      ) : (
        <>
          <TranslationMethodSelector
            materialId={material.id}
            translationPrompt={material.translationPrompt}
            initialMethod={query.method === "api" ? "api" : "browser"}
            initialFailure={query.generation === "failed"}
            generationError={material.generationError}
            savedParagraphCount={material.translationBlocks.length}
            generationStatus={material.generationStatus}
          />
          <section className="raw-transcript-section">
            <div className="section-title-row">
              <div>
                <div className="eyebrow">ENGLISH TRANSCRIPT</div>
                <h2>取得した英語字幕</h2>
              </div>
              <span>{material.transcriptText.length.toLocaleString("ja-JP")} characters</span>
            </div>
            <div className="raw-transcript" lang="en">
              {material.transcriptBlocks.map((block) => (
                <p key={block.sequence}>
                  <a
                    href={`${material.sourceUrl}&t=${Math.floor(block.startMs / 1000)}s`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {timestamp(block.startMs)}
                  </a>
                  {block.text}
                </p>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
