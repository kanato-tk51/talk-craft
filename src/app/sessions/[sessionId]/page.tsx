import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PromptPanel } from "@/components/prompt-panel";
import { getSessionDetail } from "@/modules/sessions/application/session-service";
import { linkExpressionAction, unlinkExpressionAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "セッション準備" };

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  if (!z.uuid().safeParse(sessionId).success) {
    notFound();
  }

  const detail = await getSessionDetail(sessionId);
  if (!detail) {
    notFound();
  }

  const { session, linkedExpressions, availableExpressions, prompts } = detail;
  const startPrompt = prompts.find((prompt) => prompt.type === "conversation_start");
  const reviewPrompt = prompts.find((prompt) => prompt.type === "review_output");

  return (
    <div className="page-shell detail-shell">
      <Link className="back-link" href="/sessions">
        ← セッション一覧
      </Link>

      <section className="session-hero">
        <div>
          <div className="eyebrow">SESSION PREPARATION</div>
          <h1>{session.title}</h1>
          {session.objective ? <p>{session.objective}</p> : null}
        </div>
      </section>

      <div className="session-facts">
        <div>
          <span>テーマ</span>
          <b>{session.topic}</b>
        </div>
      </div>

      <section className="preparation-card">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">EXPRESSIONS</div>
            <h2>このセッションに関連する表現</h2>
          </div>
          <span>{linkedExpressions.length} expressions</span>
        </div>
        {linkedExpressions.length ? (
          <ol className="expression-list">
            {linkedExpressions.map((expression) => (
              <li key={expression.id}>
                {expression.learningStatus === "archived" ? (
                  <div className="expression-link">
                    <span>{expression.expressionEn}</span>
                    <small>{expression.meaningJa || "ライブラリから削除済み"}</small>
                  </div>
                ) : (
                  <Link
                    className="expression-link"
                    href={`/expressions/${expression.expressionId}/edit?sessionId=${session.id}`}
                  >
                    <span>{expression.expressionEn}</span>
                    {expression.meaningJa ? <small>{expression.meaningJa}</small> : null}
                  </Link>
                )}
                <form action={unlinkExpressionAction.bind(null, session.id, expression.id)}>
                  <button className="inline-action" type="submit">
                    関連付けを解除
                  </button>
                </form>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">
            関連表現は登録されていません。表現は会話開始用プロンプトとは独立して管理されます。
          </p>
        )}

        <div className="expression-association">
          {availableExpressions.length ? (
            <form action={linkExpressionAction.bind(null, session.id)}>
              <label className="field">
                <span>表現ライブラリから追加</span>
                <select name="expressionId" required defaultValue="">
                  <option value="" disabled>
                    表現を選択
                  </option>
                  {availableExpressions.map((expression) => (
                    <option key={expression.id} value={expression.id}>
                      {expression.expressionEn}
                      {expression.meaningJa ? ` — ${expression.meaningJa}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-secondary" type="submit">
                関連付ける
              </button>
            </form>
          ) : null}
          <Link className="text-action" href={`/expressions/new?sessionId=${session.id}`}>
            ＋ 新しい表現をライブラリへ登録
          </Link>
        </div>
      </section>

      <div className="prompt-stack">
        {startPrompt ? (
          <PromptPanel
            title="会話開始用プロンプト"
            description="コピーして、利用する外部AIサービスへ貼り付けます。"
            content={startPrompt.content}
            version={startPrompt.templateVersion}
          />
        ) : null}
        {reviewPrompt ? (
          <PromptPanel
            title="振り返り出力用プロンプト"
            description="会話終了後、同じ外部AIへ貼り付けて学習記録のJSONを受け取ります。"
            content={reviewPrompt.content}
            version={reviewPrompt.templateVersion}
          />
        ) : null}
      </div>

      <div className="next-step-callout">
        <div>
          <span>次のステップ</span>
          <h2>外部AIで会話を実践</h2>
          <p>開始用プロンプトを貼り付けて会話し、終了後に振り返り用プロンプトを使います。</p>
        </div>
        <span className="callout-number">02</span>
      </div>
    </div>
  );
}
