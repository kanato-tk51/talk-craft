"use client";

import Link from "next/link";
import { type KeyboardEvent, useActionState, useState } from "react";

import { createExpressionAction, updateExpressionAction } from "@/app/expressions/actions";
import type { ExpressionActionState } from "../application/action-state";

export type ExpressionFormValues = {
  expressionEn: string;
  meaningJa: string;
  alternativeExpressions: string;
  examples: string;
  relatedWords: string;
  usageNotes: string;
  pronunciationNotes: string;
  learningStatus: "new" | "practicing" | "active" | "mastered";
  priority: "high" | "medium" | "low";
};

const emptyValues: ExpressionFormValues = {
  expressionEn: "",
  meaningJa: "",
  alternativeExpressions: "",
  examples: "",
  relatedWords: "",
  usageNotes: "",
  pronunciationNotes: "",
  learningStatus: "new",
  priority: "medium",
};

const initialState: ExpressionActionState = { message: "", fieldErrors: {} };

export function ExpressionForm({
  expressionId,
  returnToSessionId,
  initialValues = emptyValues,
}: {
  expressionId?: string;
  returnToSessionId?: string;
  initialValues?: ExpressionFormValues;
}) {
  const action = expressionId
    ? updateExpressionAction.bind(null, expressionId)
    : createExpressionAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState(initialValues);

  function update<Key extends keyof ExpressionFormValues>(
    key: Key,
    value: ExpressionFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
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

  function fieldError(name: string) {
    const error = state.fieldErrors[name]?.[0];
    return error ? <p className="field-error">{error}</p> : null;
  }

  return (
    <form action={formAction} className="session-form" onKeyDown={preventImplicitSubmit}>
      {returnToSessionId ? (
        <input name="returnToSessionId" type="hidden" value={returnToSessionId} />
      ) : null}
      {state.message ? (
        <div className="error-summary" role="alert">
          {state.message}
        </div>
      ) : null}

      <section className="form-section form-section-accent">
        <div className="form-grid">
          <label className="field field-wide">
            <span>
              英語表現 <b>必須</b>
            </span>
            <input
              name="expressionEn"
              value={values.expressionEn}
              onChange={(event) => update("expressionEn", event.target.value)}
              maxLength={1000}
              required
              placeholder="I coordinate with multiple stakeholders."
            />
            {fieldError("expressionEn")}
          </label>

          <label className="field field-wide">
            <span>日本語の意味</span>
            <input
              name="meaningJa"
              value={values.meaningJa}
              onChange={(event) => update("meaningJa", event.target.value)}
              maxLength={1000}
              placeholder="複数の関係者と調整します"
            />
          </label>

          <label className="field">
            <span>学習状態</span>
            <select
              name="learningStatus"
              value={values.learningStatus}
              onChange={(event) =>
                update(
                  "learningStatus",
                  event.target.value as ExpressionFormValues["learningStatus"],
                )
              }
            >
              <option value="new">新規</option>
              <option value="practicing">練習中</option>
              <option value="active">使える</option>
              <option value="mastered">習得済み</option>
            </select>
          </label>

          <label className="field">
            <span>優先度</span>
            <select
              name="priority"
              value={values.priority}
              onChange={(event) =>
                update("priority", event.target.value as ExpressionFormValues["priority"])
              }
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>

          <label className="field field-wide">
            <span>例文</span>
            <textarea
              name="examples"
              value={values.examples}
              onChange={(event) => update("examples", event.target.value)}
              rows={4}
              placeholder="1行に1つの例文"
            />
          </label>

          <label className="field field-wide">
            <span>別の言い方</span>
            <textarea
              name="alternativeExpressions"
              value={values.alternativeExpressions}
              onChange={(event) => update("alternativeExpressions", event.target.value)}
              rows={3}
              placeholder="1行に1表現"
            />
          </label>

          <label className="field field-wide">
            <span>関連する単語・熟語</span>
            <textarea
              name="relatedWords"
              value={values.relatedWords}
              onChange={(event) => update("relatedWords", event.target.value)}
              rows={3}
              placeholder="1行に1項目"
            />
          </label>

          <label className="field field-wide">
            <span>使い方のメモ</span>
            <textarea
              name="usageNotes"
              value={values.usageNotes}
              onChange={(event) => update("usageNotes", event.target.value)}
              rows={3}
            />
          </label>

          <label className="field field-wide">
            <span>発音メモ</span>
            <textarea
              name="pronunciationNotes"
              value={values.pronunciationNotes}
              onChange={(event) => update("pronunciationNotes", event.target.value)}
              rows={2}
            />
          </label>
        </div>
      </section>

      <div className="form-actions">
        <Link
          className="button button-secondary"
          href={returnToSessionId ? `/sessions/${returnToSessionId}` : "/expressions"}
        >
          キャンセル
        </Link>
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "保存しています…" : expressionId ? "変更を保存" : "表現を登録"}
        </button>
      </div>
    </form>
  );
}
