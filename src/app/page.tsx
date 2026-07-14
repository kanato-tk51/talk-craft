import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">PREPARE · PRACTICE · REVIEW</div>
          <h1>
            話す前の準備を、
            <br />
            次に話せる英語へ。
          </h1>
          <p>
            どの対話AIを使っても、英会話のテーマ、使いたい表現、会話後の学びを同じ場所につなげます。
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/sessions/new">
              最初のセッションを作る
            </Link>
            <Link className="text-link" href="/sessions">
              セッションを見る →
            </Link>
          </div>
        </div>
        <section className="cycle-card" aria-label="学習サイクル">
          <div className="cycle-item active">
            <span>01</span>
            <div>
              <b>Prepare</b>
              <small>テーマと表現を準備</small>
            </div>
          </div>
          <div className="cycle-line" />
          <div className="cycle-item">
            <span>02</span>
            <div>
              <b>Practice</b>
              <small>好きな外部AIで実践</small>
            </div>
          </div>
          <div className="cycle-line" />
          <div className="cycle-item">
            <span>03</span>
            <div>
              <b>Review</b>
              <small>学びを次回へ引き継ぐ</small>
            </div>
          </div>
        </section>
      </section>

      <section className="principles" aria-label="Talk Craftの特徴">
        <article>
          <span>↗</span>
          <h2>AIは自由に選ぶ</h2>
          <p>音声でもテキストでも。特定サービスに学習履歴を閉じ込めません。</p>
        </article>
        <article>
          <span>◎</span>
          <h2>会話を止めない</h2>
          <p>使いたい表現を準備し、訂正は会話後の振り返りにまとめます。</p>
        </article>
        <article>
          <span>↻</span>
          <h2>学びを循環させる</h2>
          <p>言えなかったことを、次の会話で使う表現へ変えていきます。</p>
        </article>
      </section>
    </div>
  );
}
