"use client";

import { useActionState } from "react";

import { saveTranslationAction } from "@/app/youtube/[materialId]/actions";
import type { TranslationImportActionState } from "../application/action-state";

const initialState: TranslationImportActionState = { message: "" };

export function TranslationImportForm({
  materialId,
  isUpdate = false,
}: {
  materialId: string;
  isUpdate?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveTranslationAction.bind(null, materialId),
    initialState,
  );

  return (
    <form action={formAction} className="translation-import-form">
      {state.message && state.message !== "saved" ? (
        <div className="error-summary" role="alert">
          {state.message}
        </div>
      ) : null}
      {state.message === "saved" ? (
        <div className="success-summary" role="status">
          翻訳と重要表現を登録しました。
        </div>
      ) : null}
      <label className="field field-wide">
        <span>
          ChatGPTの回答（JSON） <b>必須</b>
        </span>
        <textarea
          name="rawAiResponse"
          rows={12}
          required
          placeholder={'{"summary_ja":"…","translation_paragraphs":[…],"key_expressions":[…]}'}
        />
        <small className="field-help">
          前後に説明やコードブロックが付いていても読み取れます。登録前に項目と番号を検証します。
        </small>
      </label>
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "確認して保存しています…" : isUpdate ? "翻訳を更新" : "翻訳を登録"}
      </button>
    </form>
  );
}
