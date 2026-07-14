import type { Metadata } from "next";
import Link from "next/link";

import { listSessions } from "@/modules/sessions/application/session-service";

export const metadata: Metadata = { title: "セッション" };
export const dynamic = "force-dynamic";

const statusLabels = {
  draft: "準備中",
  ready: "準備完了",
  in_progress: "会話中",
  awaiting_review: "復習待ち",
  completed: "完了",
  archived: "アーカイブ",
};

export default async function SessionsPage() {
  const sessionItems = await listSessions();

  return (
    <div className="page-shell">
      <div className="list-heading">
        <div>
          <div className="eyebrow">SESSIONS</div>
          <h1>英会話セッション</h1>
          <p>準備したことと、会話から得た学びを一つの流れで残します。</p>
        </div>
        <Link className="button button-primary" href="/sessions/new">
          ＋ セッションを作成
        </Link>
      </div>

      {sessionItems.length === 0 ? (
        <section className="empty-state">
          <span className="empty-mark">01</span>
          <h2>最初の会話を準備しましょう</h2>
          <p>会話テーマを決めて、外部AIで使うプロンプトを作成できます。</p>
          <Link className="button button-primary" href="/sessions/new">
            セッションを作る
          </Link>
        </section>
      ) : (
        <div className="session-list">
          {sessionItems.map((session) => (
            <Link className="session-row" href={`/sessions/${session.id}`} key={session.id}>
              <div className="session-main">
                <div className="session-meta">
                  <span className={`status status-${session.status}`}>
                    {statusLabels[session.status]}
                  </span>
                </div>
                <h2>{session.title}</h2>
                <p>{session.topic}</p>
              </div>
              <span className="row-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
