"use client";

import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import type { YoutubeGenerationStatus } from "../domain/youtube-generation";
import { AutomaticTranslationPanel } from "./automatic-translation-panel";
import { TranslationImportForm } from "./translation-import-form";

type TranslationMethod = "api" | "browser";

export function TranslationMethodSelector({
  materialId,
  translationPrompt,
  initialMethod,
  initialFailure,
  generationError,
  savedParagraphCount,
  generationStatus,
}: {
  materialId: string;
  translationPrompt: string;
  initialMethod: TranslationMethod;
  initialFailure: boolean;
  generationError: string;
  savedParagraphCount: number;
  generationStatus: YoutubeGenerationStatus;
}) {
  const [method, setMethod] = useState<TranslationMethod>(initialMethod);
  const backgroundActive = ["queued", "structuring", "translating"].includes(generationStatus);
  const selectedMethod = backgroundActive ? "api" : method;

  return (
    <div className="translation-method-selector">
      <section className="translation-method-chooser">
        <div>
          <div className="eyebrow">TRANSLATION METHOD</div>
          <h2>日本語教材の作り方を選択</h2>
          <p>APIで自動生成する方法と、ブラウザ版ChatGPTを使う方法のどちらも利用できます。</p>
        </div>
        <div className="translation-method-tabs" role="tablist" aria-label="日本語訳の作成方法">
          <button
            className={selectedMethod === "browser" ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={selectedMethod === "browser"}
            onClick={() => setMethod("browser")}
            disabled={backgroundActive}
            title={backgroundActive ? "APIによる生成が進行中です" : undefined}
          >
            ブラウザ版ChatGPT
          </button>
          <button
            className={selectedMethod === "api" ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={selectedMethod === "api"}
            onClick={() => setMethod("api")}
          >
            APIで自動生成
          </button>
        </div>
      </section>

      {selectedMethod === "api" ? (
        <AutomaticTranslationPanel
          materialId={materialId}
          initialFailure={initialFailure}
          generationError={generationError}
          savedParagraphCount={savedParagraphCount}
          generationStatus={generationStatus}
        />
      ) : (
        <BrowserTranslationPanel materialId={materialId} translationPrompt={translationPrompt} />
      )}
    </div>
  );
}

function BrowserTranslationPanel({
  materialId,
  translationPrompt,
}: {
  materialId: string;
  translationPrompt: string;
}) {
  return (
    <div className="browser-translation-workflow">
      <section className="browser-prompt-panel">
        <div className="workflow-heading">
          <span>01</span>
          <div>
            <h2>プロンプトをChatGPTへ貼り付ける</h2>
            <p>コピー後にブラウザ版ChatGPTを開き、そのまま貼り付けて回答させます。</p>
          </div>
          <div className="browser-prompt-actions">
            <CopyButton text={translationPrompt} />
            <a
              className="button button-secondary"
              href="https://chatgpt.com/"
              target="_blank"
              rel="noreferrer"
            >
              ChatGPTを開く ↗
            </a>
          </div>
        </div>
        <details className="browser-prompt-details">
          <summary>コピーするプロンプトを確認</summary>
          <pre className="prompt-content">{translationPrompt}</pre>
        </details>
      </section>

      <section className="translation-import-panel">
        <div className="workflow-heading">
          <span>02</span>
          <div>
            <h2>ChatGPTの回答を登録する</h2>
            <p>返ってきたJSONを省略せず貼り付けると、日本語訳と重要表現を登録できます。</p>
          </div>
        </div>
        <TranslationImportForm materialId={materialId} />
      </section>
    </div>
  );
}
