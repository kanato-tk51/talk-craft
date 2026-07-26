"use client";

import Link from "next/link";
import { useActionState } from "react";

import { saveTranscriptAction } from "@/app/youtube/[materialId]/actions";
import type { TranscriptBlock } from "../domain/youtube-material";

type YoutubeTranscriptEditFormProps = {
  materialId: string;
  sourceUrl: string;
  transcriptBlocks: TranscriptBlock[];
  hasTranslation: boolean;
};

const initialState = { message: "" };

export function YoutubeTranscriptEditForm({
  materialId,
  sourceUrl,
  transcriptBlocks,
  hasTranslation,
}: YoutubeTranscriptEditFormProps) {
  const [state, formAction, pending] = useActionState(
    saveTranscriptAction.bind(null, materialId),
    initialState,
  );

  return (
    <form action={formAction} className="session-form transcript-edit-form">
      {state.message ? (
        <div className="error-summary" role="alert">
          {state.message}
        </div>
      ) : null}

      {hasTranslation ? (
        <div className="transcript-edit-warning" role="note">
          <strong>保存すると現在の翻訳内容はリセットされます。</strong>
          <span>
            英語原文との不整合を防ぐため、要約・日本語訳・重要表現を削除し、ChatGPTの回答待ちに戻します。
          </span>
        </div>
      ) : null}

      <section className="form-section form-section-accent">
        <div className="section-heading">
          <span className="step-number">EN</span>
          <div>
            <h2>英語字幕を修正する</h2>
            <p>再生位置はそのまま保持されます。修正したい字幕本文だけを書き換えてください。</p>
          </div>
        </div>

        <div className="transcript-edit-list">
          {transcriptBlocks.map((block) => (
            <label className="transcript-edit-row" key={block.sequence}>
              <a
                className="transcript-edit-time"
                href={`${sourceUrl}&t=${Math.floor(block.startMs / 1000)}s`}
                target="_blank"
                rel="noreferrer"
              >
                {formatTimestamp(block.startMs)} ↗
              </a>
              <textarea
                name={`transcriptBlock-${block.sequence}`}
                rows={Math.max(2, Math.ceil(block.text.length / 90))}
                maxLength={200000}
                required
                spellCheck
                defaultValue={block.text}
                aria-label={`${formatTimestamp(block.startMs)}からの英語字幕`}
              />
            </label>
          ))}
        </div>
      </section>

      <div className="form-actions">
        <Link className="button button-secondary" href={`/youtube/${materialId}`}>
          キャンセル
        </Link>
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "保存しています…" : "英語字幕を保存"}
        </button>
      </div>
    </form>
  );
}

function formatTimestamp(startMs: number): string {
  const totalSeconds = Math.floor(startMs / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
