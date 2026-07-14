import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PromptPanel } from "@/components/prompt-panel";
import { getSessionDetail } from "@/modules/sessions/application/session-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "セッション準備" };

const typeLabels = {
  voice: "音声会話",
  text: "テキストチャット",
  mixed: "音声とテキスト",
  unknown: "未定",
};

const difficultyLabels = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
  unspecified: "指定なし",
};

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

  const { session, preparedExpressions, prompts } = detail;
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
          <p>{session.objective}</p>
        </div>
        {session.providerWebsiteUrlSnapshot ? (
          <a
            className="button button-primary"
            href={session.providerWebsiteUrlSnapshot}
            rel="noreferrer"
            target="_blank"
          >
            外部AIを開く ↗
          </a>
        ) : null}
      </section>

      <div className="session-facts">
        <div>
          <span>テーマ</span>
          <b>{session.topic}</b>
        </div>
        <div>
          <span>会話方法</span>
          <b>{typeLabels[session.conversationType]}</b>
        </div>
        <div>
          <span>難易度</span>
          <b>{difficultyLabels[session.difficulty]}</b>
        </div>
        <div>
          <span>時間</span>
          <b>{session.plannedDurationMinutes ? `${session.plannedDurationMinutes}分` : "未定"}</b>
        </div>
        <div>
          <span>利用AI</span>
          <b>{session.providerNameSnapshot || "未定"}</b>
        </div>
        <div>
          <span>予定</span>
          <b>
            {session.scheduledAt
              ? new Intl.DateTimeFormat("ja-JP", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(session.scheduledAt)
              : "未定"}
          </b>
        </div>
      </div>

      <section className="preparation-card">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">EXPRESSIONS</div>
            <h2>今回使ってみる表現</h2>
          </div>
          <span>{preparedExpressions.length} expressions</span>
        </div>
        {preparedExpressions.length ? (
          <ol className="expression-list">
            {preparedExpressions.map((expression) => (
              <li key={expression.id}>
                <span>{expression.expressionEn}</span>
                {expression.meaningJa ? <small>{expression.meaningJa}</small> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">
            事前表現は登録されていません。テーマと目的だけでも会話を開始できます。
          </p>
        )}
      </section>

      {session.preparationNotes ? (
        <aside className="focus-note">
          <span>FOCUS</span>
          <p>{session.preparationNotes}</p>
        </aside>
      ) : null}

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
