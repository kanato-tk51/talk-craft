import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentActorId } from "@/modules/auth/application/current-actor";

import "./styles.css";

export const metadata: Metadata = {
  title: {
    default: "Talk Craft",
    template: "%s · Talk Craft",
  },
  description: "外部AIとの英会話を、予習から復習までつなげる学習管理ツール",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await getCurrentActorId();

  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/sessions">
              <span className="brand-mark">TC</span>
              <span>Talk Craft</span>
            </Link>
            <nav aria-label="メインナビゲーション">
              <Link href="/sessions">セッション</Link>
              <Link href="/youtube">YouTube教材</Link>
              <Link href="/expressions">表現ライブラリ</Link>
            </nav>
            <Link className="header-action" href="/sessions/new">
              ＋ 新しいセッション
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
