import { CopyButton } from "@/components/copy-button";
import { TranslationImportForm } from "./translation-import-form";

export function BrowserTranslationWorkflow({
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
