import type { Metadata } from "next";
import Link from "next/link";

import { listExpressions } from "@/modules/expressions/application/expression-service";

export const metadata: Metadata = { title: "表現ライブラリ" };
export const dynamic = "force-dynamic";

const statusLabels = {
  new: "新規",
  practicing: "練習中",
  active: "使える",
  mastered: "習得済み",
  archived: "削除済み",
};

const priorityLabels = { high: "優先度 高", medium: "優先度 中", low: "優先度 低" };

export default async function ExpressionsPage() {
  const items = await listExpressions();

  return (
    <div className="page-shell">
      <div className="list-heading">
        <div>
          <div className="eyebrow">EXPRESSION LIBRARY</div>
          <h1>表現ライブラリ</h1>
          <p>
            単語・熟語・言い回しをセッションから独立して蓄積し、今後の復習に使える形で残します。
          </p>
        </div>
        <Link className="button button-primary" href="/expressions/new">
          ＋ 表現を登録
        </Link>
      </div>

      {items.length ? (
        <div className="library-grid">
          {items.map((expression) => (
            <Link
              className="expression-card"
              href={`/expressions/${expression.id}/edit`}
              key={expression.id}
            >
              <div className="session-meta">
                <span className="status">{statusLabels[expression.learningStatus]}</span>
                <span>{priorityLabels[expression.priority]}</span>
              </div>
              <h2>{expression.expressionEn}</h2>
              <p>{expression.meaningJa || "意味は未登録です"}</p>
              {expression.examples[0] ? <small>例: {expression.examples[0]}</small> : null}
            </Link>
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <span className="empty-mark">A</span>
          <h2>最初の表現を登録しましょう</h2>
          <p>会話の前後を問わず追加でき、セッションとの関連付けや将来の一問一答復習に使えます。</p>
          <Link className="button button-primary" href="/expressions/new">
            表現を登録
          </Link>
        </section>
      )}
    </div>
  );
}
