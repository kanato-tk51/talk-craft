import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getYoutubeMaterial } from "@/modules/youtube/application/youtube-service";
import { YoutubeTranscriptEditForm } from "@/modules/youtube/ui/youtube-transcript-edit-form";

export const metadata: Metadata = { title: "英語字幕を編集" };
export const dynamic = "force-dynamic";

export default async function EditYoutubeTranscriptPage({
  params,
}: {
  params: Promise<{ materialId: string }>;
}) {
  const { materialId } = await params;
  if (!z.uuid().safeParse(materialId).success) notFound();

  const material = await getYoutubeMaterial(materialId);
  if (!material) notFound();

  return (
    <div className="page-shell narrow-shell">
      <div className="page-intro">
        <div className="eyebrow">EDIT ENGLISH TRANSCRIPT</div>
        <h1>英語字幕を編集する</h1>
        <p>
          YouTubeの音声と見比べながら、誤認識やスペルミスを修正できます。各字幕の再生時刻は変更されません。
        </p>
      </div>
      <YoutubeTranscriptEditForm
        materialId={material.id}
        sourceUrl={material.sourceUrl}
        transcriptBlocks={material.transcriptBlocks}
        hasTranslation={material.translatedAt !== null}
      />
    </div>
  );
}
