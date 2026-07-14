import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell">
      <section className="empty-state">
        <span className="empty-mark">404</span>
        <h1>ページが見つかりません</h1>
        <p>URLが正しいか、セッションが削除されていないか確認してください。</p>
        <Link className="button button-primary" href="/sessions">
          セッション一覧へ
        </Link>
      </section>
    </div>
  );
}
