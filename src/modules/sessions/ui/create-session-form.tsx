"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";

import { createSessionAction } from "@/app/sessions/new/actions";
import type { CreateSessionActionState } from "../application/action-state";

const initialState: CreateSessionActionState = {
  message: "",
  fieldErrors: {},
};

export function CreateSessionForm() {
  const [state, formAction, pending] = useActionState(createSessionAction, initialState);
  const timezoneOffsetRef = useRef<HTMLInputElement>(null);

  function fieldError(name: string) {
    const error = state.fieldErrors[name]?.[0];
    return error ? <p className="field-error">{error}</p> : null;
  }

  return (
    <form
      action={formAction}
      className="session-form"
      onSubmit={() => {
        if (timezoneOffsetRef.current) {
          timezoneOffsetRef.current.value = String(new Date().getTimezoneOffset());
        }
      }}
    >
      {state.message ? (
        <div className="error-summary" role="alert" tabIndex={-1}>
          {state.message}
        </div>
      ) : null}

      <section className="form-section" aria-labelledby="basics-heading">
        <div className="section-heading">
          <span className="step-number">01</span>
          <div>
            <h2 id="basics-heading">会話のゴール</h2>
            <p>まず、何を話し、何ができるようになりたいかを決めます。</p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field field-wide">
            <span>
              セッションタイトル <b>必須</b>
            </span>
            <input name="title" maxLength={120} required placeholder="海外出張先での自己紹介" />
            {fieldError("title")}
          </label>

          <label className="field">
            <span>
              会話テーマ <b>必須</b>
            </span>
            <input name="topic" maxLength={500} required placeholder="仕事について自己紹介する" />
            {fieldError("topic")}
          </label>

          <label className="field">
            <span>予定日時</span>
            <input name="scheduledAtLocal" type="datetime-local" />
            <input
              ref={timezoneOffsetRef}
              name="timezoneOffsetMinutes"
              type="hidden"
              value="0"
              readOnly
            />
          </label>

          <label className="field field-wide">
            <span>
              今回の目的 <b>必須</b>
            </span>
            <textarea
              name="objective"
              maxLength={2000}
              required
              rows={3}
              placeholder="自分の仕事内容と役割を、短文で止まらず自然に説明できるようになる"
            />
            {fieldError("objective")}
          </label>

          <label className="field field-wide">
            <span>シチュエーション</span>
            <textarea
              name="situation"
              maxLength={2000}
              rows={2}
              placeholder="初めて会う海外の取引先とのカジュアルな打ち合わせ"
            />
          </label>

          <label className="field">
            <span>あなたの役割</span>
            <input name="userRole" maxLength={500} placeholder="プロジェクトリード" />
          </label>

          <label className="field">
            <span>AIに担当してほしい役割</span>
            <input name="aiRole" maxLength={500} placeholder="海外の取引先担当者" />
          </label>
        </div>
      </section>

      <section className="form-section" aria-labelledby="conditions-heading">
        <div className="section-heading">
          <span className="step-number">02</span>
          <div>
            <h2 id="conditions-heading">会話の条件</h2>
            <p>使うサービスは後から決めても構いません。</p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>会話方法</span>
            <select name="conversationType" defaultValue="voice">
              <option value="voice">音声会話</option>
              <option value="text">テキストチャット</option>
              <option value="mixed">音声とテキスト</option>
              <option value="unknown">未定</option>
            </select>
          </label>

          <label className="field">
            <span>難易度</span>
            <select name="difficulty" defaultValue="intermediate">
              <option value="beginner">初級</option>
              <option value="intermediate">中級</option>
              <option value="advanced">上級</option>
              <option value="unspecified">指定なし</option>
            </select>
          </label>

          <label className="field">
            <span>会話時間の目安（分）</span>
            <input
              name="plannedDurationMinutes"
              type="number"
              min={1}
              max={240}
              defaultValue={15}
            />
          </label>

          <label className="field">
            <span>利用するAIサービス</span>
            <input name="providerName" maxLength={200} placeholder="未定でも保存できます" />
          </label>

          <label className="field">
            <span>AIサービスのURL</span>
            <input name="providerWebsiteUrl" type="url" placeholder="https://…" maxLength={2000} />
            {fieldError("providerWebsiteUrl")}
          </label>

          <label className="field">
            <span>モデル名（任意）</span>
            <input name="modelName" maxLength={200} placeholder="不明なら空欄" />
          </label>

          <label className="field field-wide">
            <span>今回意識すること</span>
            <textarea
              name="preparationNotes"
              maxLength={5000}
              rows={3}
              placeholder="短い文章だけで終わらず、理由や具体例まで伝える"
            />
          </label>
        </div>
      </section>

      <section className="form-section form-section-accent" aria-labelledby="expressions-heading">
        <div className="section-heading">
          <span className="step-number">03</span>
          <div>
            <h2 id="expressions-heading">使ってみたい表現</h2>
            <p>
              1行に1表現。日本語の意味は <code>|</code> の後ろに書けます。
            </p>
          </div>
        </div>

        <label className="field">
          <span>英語表現 | 日本語の意味</span>
          <textarea
            name="preparedExpressions"
            maxLength={100000}
            rows={7}
            spellCheck
            placeholder={
              "I act as a bridge between the teams. | チーム間の橋渡し役をしています\nI coordinate with multiple stakeholders. | 複数の関係者と調整します"
            }
          />
          {fieldError("preparedExpressions")}
        </label>
      </section>

      <div className="form-actions">
        <Link className="button button-secondary" href="/sessions">
          キャンセル
        </Link>
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "準備しています…" : "セッションを作成"}
        </button>
      </div>
    </form>
  );
}
