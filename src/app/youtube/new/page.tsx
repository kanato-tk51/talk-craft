import type { Metadata } from "next";

import { YoutubeImportForm } from "@/modules/youtube/ui/youtube-import-form";

export const metadata: Metadata = { title: "YouTube動画を取り込む" };
export const maxDuration = 1800;

export default function NewYoutubeMaterialPage() {
  return (
    <div className="page-shell narrow-shell">
      <div className="page-intro">
        <div className="eyebrow">NEW YOUTUBE MATERIAL</div>
        <h1>動画から教材を作る</h1>
        <p>URLを貼るだけで、英語字幕の取得から自然な段落、日本語訳、重要表現まで作ります。</p>
      </div>
      <YoutubeImportForm />
    </div>
  );
}
