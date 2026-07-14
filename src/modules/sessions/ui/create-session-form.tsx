"use client";

import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  startTransition,
  useActionState,
  useRef,
  useState,
} from "react";

import { createSessionAction } from "@/app/sessions/new/actions";
import type { CreateSessionActionState } from "../application/action-state";
import { MAX_LINKED_EXPRESSIONS } from "../domain/create-session";

const initialState: CreateSessionActionState = {
  message: "",
  fieldErrors: {},
};

export function CreateSessionForm() {
  const [state, formAction, pending] = useActionState(createSessionAction, initialState);
  const [expressionIds, setExpressionIds] = useState<number[]>([]);
  const nextExpressionId = useRef(1);

  function addExpression() {
    const id = nextExpressionId.current;
    nextExpressionId.current += 1;
    setExpressionIds((current) => [...current, id]);
    requestAnimationFrame(() => document.getElementById(`linked-expression-${id}`)?.focus());
  }

  function removeExpression(id: number) {
    setExpressionIds((current) => current.filter((currentId) => currentId !== id));
  }

  function fieldError(name: string) {
    const error = state.fieldErrors[name]?.[0];
    return error ? <p className="field-error">{error}</p> : null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  function preventImplicitSubmit(event: KeyboardEvent<HTMLFormElement>) {
    if (
      event.key === "Enter" &&
      !event.nativeEvent.isComposing &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
    }
  }

  return (
    <form className="session-form" onKeyDown={preventImplicitSubmit} onSubmit={handleSubmit}>
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

          <label className="field field-wide">
            <span>
              会話テーマ <b>必須</b>
            </span>
            <input name="topic" maxLength={500} required placeholder="仕事について自己紹介する" />
            {fieldError("topic")}
          </label>

          <label className="field field-wide">
            <span>今回の目的（任意）</span>
            <textarea
              name="objective"
              maxLength={2000}
              rows={3}
              placeholder="自分の仕事内容と役割を、短文で止まらず自然に説明できるようになる"
            />
            {fieldError("objective")}
          </label>
        </div>
      </section>

      <section className="form-section form-section-accent" aria-labelledby="expressions-heading">
        <div className="section-heading">
          <span className="step-number">02</span>
          <div>
            <h2 id="expressions-heading">関連付ける表現</h2>
            <p>表現は独立したライブラリへ保存され、このセッションと関連付けられます。</p>
          </div>
        </div>

        {expressionIds.length ? (
          <div className="expression-entry-list">
            {expressionIds.map((id, index) => (
              <div className="expression-entry" key={id}>
                <div className="expression-entry-heading">
                  <strong>表現 {String(index + 1).padStart(2, "0")}</strong>
                  <button
                    className="inline-action"
                    type="button"
                    onClick={() => removeExpression(id)}
                    disabled={pending}
                  >
                    この表現を削除
                  </button>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>
                      英語表現 <b>必須</b>
                    </span>
                    <input
                      id={`linked-expression-${id}`}
                      name="linkedExpressionEn"
                      maxLength={1000}
                      required
                      spellCheck
                      placeholder="I act as a bridge between the teams."
                    />
                  </label>
                  <label className="field">
                    <span>日本語の意味（任意）</span>
                    <input
                      name="linkedExpressionMeaningJa"
                      maxLength={1000}
                      placeholder="チーム間の橋渡し役をしています"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="expression-entry-empty">
            関連付ける表現はまだありません。必要な数だけ、1件ずつ追加できます。
          </p>
        )}

        {fieldError("linkedExpressions")}
        <button
          className="button button-secondary expression-add-button"
          type="button"
          onClick={addExpression}
          disabled={pending || expressionIds.length >= MAX_LINKED_EXPRESSIONS}
        >
          ＋ 表現を追加
        </button>
        <small className="field-help">
          各表現はライブラリの独立したデータとして保存されます。会話開始用プロンプトには含まれません。
        </small>
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
