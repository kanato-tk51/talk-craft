"use client";

import Link from "next/link";
import { useActionState } from "react";

import { importYoutubeAction } from "@/app/youtube/new/actions";
import type { YoutubeImportActionState } from "../application/action-state";

const initialState: YoutubeImportActionState = { message: "", fieldErrors: {} };

export function YoutubeImportForm() {
  const [state, formAction, pending] = useActionState(importYoutubeAction, initialState);

  return (
    <form action={formAction} className="session-form">
      {state.message ? (
        <div className="error-summary" role="alert">
          {state.message}
        </div>
      ) : null}

      <section className="form-section form-section-accent">
        <div className="section-heading">
          <span className="step-number">01</span>
          <div>
            <h2>YouTube動画を選ぶ</h2>
            <p>公開動画の英語字幕を取得し、ChatGPTへ渡すプロンプトを作成します。</p>
          </div>
        </div>
        <label className="field field-wide">
          <span>
            YouTube URL <b>必須</b>
          </span>
          <input
            name="youtubeUrl"
            type="url"
            inputMode="url"
            maxLength={2000}
            required
            placeholder="https://www.youtube.com/watch?v=..."
            aria-describedby="youtube-url-help"
          />
          {state.fieldErrors.youtubeUrl?.[0] ? (
            <p className="field-error">{state.fieldErrors.youtubeUrl[0]}</p>
          ) : null}
          <small className="field-help" id="youtube-url-help">
            手動または自動生成の英語字幕が公開されている動画に対応します。
          </small>
        </label>
      </section>

      <div className="form-actions">
        <Link className="button button-secondary" href="/youtube">
          キャンセル
        </Link>
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "字幕を取得しています…" : "URLから教材を作成"}
        </button>
      </div>
    </form>
  );
}
