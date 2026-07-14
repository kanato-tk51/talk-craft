import type { Metadata } from "next";

import { CreateSessionForm } from "@/modules/sessions/ui/create-session-form";

export const metadata: Metadata = { title: "セッションを作成" };

export default function NewSessionPage() {
  return (
    <div className="page-shell narrow-shell">
      <div className="page-intro">
        <div className="eyebrow">NEW SESSION</div>
        <h1>次の会話を準備する</h1>
        <p>空欄があっても大丈夫です。テーマと目的から、外部AIで使える汎用プロンプトを作ります。</p>
      </div>
      <CreateSessionForm />
    </div>
  );
}
