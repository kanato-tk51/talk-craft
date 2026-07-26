"use client";

import Link from "next/link";
import { useActionState } from "react";

import { importYoutubeAction } from "@/app/youtube/new/actions";
import type { YoutubeImportActionState } from "../application/action-state";

const initialState: YoutubeImportActionState = {
  message: "",
  values: { youtubeUrl: "", title: "", channelName: "", transcript: "" },
  fieldErrors: {},
};

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
            <h2>動画情報を入力する</h2>
            <p>YouTubeへの自動アクセスは行わず、動画を識別・再生するためにURLを保存します。</p>
          </div>
        </div>
        <div className="form-grid">
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
              defaultValue={state.values.youtubeUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              aria-describedby="youtube-url-help"
            />
            {state.fieldErrors.youtubeUrl?.[0] ? (
              <p className="field-error">{state.fieldErrors.youtubeUrl[0]}</p>
            ) : null}
            <small className="field-help" id="youtube-url-help">
              通常の動画、短縮URL、ShortsのURLに対応します。
            </small>
          </label>
          <label className="field">
            <span>動画タイトル（任意）</span>
            <input
              name="title"
              type="text"
              maxLength={300}
              defaultValue={state.values.title}
              placeholder="未入力の場合は「YouTube動画」"
            />
            {state.fieldErrors.title?.[0] ? (
              <p className="field-error">{state.fieldErrors.title[0]}</p>
            ) : null}
          </label>
          <label className="field">
            <span>チャンネル名（任意）</span>
            <input
              name="channelName"
              type="text"
              maxLength={200}
              defaultValue={state.values.channelName}
              placeholder="例: mayuko"
            />
            {state.fieldErrors.channelName?.[0] ? (
              <p className="field-error">{state.fieldErrors.channelName[0]}</p>
            ) : null}
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="section-heading">
          <span className="step-number">02</span>
          <div>
            <h2>英語字幕を貼り付ける</h2>
            <p>
              YouTubeの動画説明欄から「文字起こしを表示」を開き、章見出し・タイムスタンプを含めてコピーしてください。
            </p>
          </div>
        </div>
        <label className="field field-wide">
          <span>
            YouTubeの文字起こし <b>必須</b>
          </span>
          <textarea
            className="transcript-paste-input"
            name="transcript"
            rows={24}
            maxLength={200000}
            required
            spellCheck={false}
            defaultValue={state.values.transcript}
            placeholder={`Intro
0:00
this video is sponsored by formation
0:02
stick around to hear more about how`}
            aria-describedby="youtube-transcript-help"
          />
          {state.fieldErrors.transcript?.[0] ? (
            <p className="field-error">{state.fieldErrors.transcript[0]}</p>
          ) : null}
          <small className="field-help" id="youtube-transcript-help">
            「0:00」のような時刻と、その直後の英文を解析します。章見出しが含まれていてもそのまま貼り付けられます。
          </small>
        </label>
      </section>

      <div className="form-actions">
        <Link className="button button-secondary" href="/youtube">
          キャンセル
        </Link>
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "教材を作成しています…" : "貼り付けた字幕から教材を作成"}
        </button>
      </div>
    </form>
  );
}
