import type { Metadata } from "next";
import Link from "next/link";

import { listYoutubeMaterials } from "@/modules/youtube/application/youtube-service";

export const metadata: Metadata = { title: "YouTube教材" };
export const dynamic = "force-dynamic";

export default async function YoutubeMaterialsPage() {
  const materials = await listYoutubeMaterials();

  return (
    <div className="page-shell">
      <div className="list-heading">
        <div>
          <div className="eyebrow">YOUTUBE STUDY</div>
          <h1>YouTube教材</h1>
          <p>英語字幕を取り込み、原文・日本語訳・覚えたい表現を一つの教材にまとめます。</p>
        </div>
        <Link className="button button-primary" href="/youtube/new">
          ＋ 動画を取り込む
        </Link>
      </div>

      {materials.length ? (
        <div className="youtube-library-grid">
          {materials.map((material) => (
            <Link className="youtube-card" href={`/youtube/${material.id}`} key={material.id}>
              {/* The source is a URL returned by YouTube, not user-authored HTML. */}
              {/* biome-ignore lint/performance/noImgElement: remote YouTube thumbnails have varying hosts. */}
              <img src={material.thumbnailUrl} alt="" />
              <div>
                <div className="session-meta">
                  <span
                    className={`status ${material.translatedAt ? "" : "status-awaiting_review"}`}
                  >
                    {material.translatedAt ? "教材登録済み" : "ChatGPTの回答待ち"}
                  </span>
                  <span>{material.captionTrackName}</span>
                </div>
                <h2>{material.title}</h2>
                <p>{material.channelName || "チャンネル名不明"}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <span className="empty-mark">YT</span>
          <h2>英語字幕から教材を作りましょう</h2>
          <p>YouTubeのリンクを貼るだけで、英語原文・日本語訳・重要表現をまとめます。</p>
          <Link className="button button-primary" href="/youtube/new">
            最初の動画を取り込む
          </Link>
        </section>
      )}
    </div>
  );
}
