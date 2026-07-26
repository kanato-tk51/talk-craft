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
        <p>
          URLから英語字幕を取得し、ChatGPTで日本語訳と重要表現を作るためのプロンプトを用意します。
        </p>
      </div>
      <YoutubeImportForm />
    </div>
  );
}
