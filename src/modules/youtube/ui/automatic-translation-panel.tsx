"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { retryAutomaticTranslationAction } from "@/app/youtube/[materialId]/actions";
import type { TranslationImportActionState } from "../application/action-state";
import type { YoutubeGenerationStatus } from "../domain/youtube-generation";

const initialState: TranslationImportActionState = { message: "" };

export function AutomaticTranslationPanel({
  materialId,
  initialFailure = false,
  generationError = "",
  savedParagraphCount = 0,
  generationStatus = "pending",
}: {
  materialId: string;
  initialFailure?: boolean;
  generationError?: string;
  savedParagraphCount?: number;
  generationStatus?: YoutubeGenerationStatus;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    retryAutomaticTranslationAction.bind(null, materialId),
    initialState,
  );
  const backgroundActive = ["queued", "structuring", "translating"].includes(generationStatus);

  useEffect(() => {
    if (!backgroundActive) return;
    const timer = window.setInterval(() => router.refresh(), 2_000);
    return () => window.clearInterval(timer);
  }, [backgroundActive, router]);

  return (
    <section className="automatic-translation-panel">
      <div>
        <div className="eyebrow">AUTOMATIC TRANSLATION</div>
        <h2>AIで日本語教材を生成</h2>
        <p>
          字幕全体の意味構造を分析してから、自然な段落、日本語訳、重要表現をバックグラウンドで自動生成します。ページを閉じたり移動したりしても処理は続きます。
        </p>
        {savedParagraphCount > 0 ? (
          <p>{savedParagraphCount}段落まで保存済みです。再実行すると続きから再開します。</p>
        ) : null}
      </div>

      {(initialFailure || generationError) && !state.message ? (
        <div className="error-summary" role="alert">
          {generationError ||
            "最初の自動生成を完了できませんでした。保存済みの途中経過から再実行できます。"}
        </div>
      ) : null}
      {state.message && state.message !== "saved" ? (
        state.message === "queued" && backgroundActive ? (
          <div className="success-summary" role="status">
            バックグラウンド処理を開始しました。このページを離れても生成は続きます。
          </div>
        ) : state.message !== "queued" ? (
          <div className="error-summary" role="alert">
            {state.message}
          </div>
        ) : null
      ) : null}
      <form action={formAction}>
        <button
          className="button button-primary"
          type="submit"
          disabled={pending || backgroundActive}
        >
          {pending
            ? "開始しています…"
            : generationStatus === "queued"
              ? "バックグラウンド処理の開始待ち…"
              : backgroundActive
                ? "バックグラウンドで生成中…"
                : "自動生成を再実行"}
        </button>
      </form>
    </section>
  );
}
