import type { Metadata } from "next";

import { CreateSessionForm } from "@/modules/sessions/ui/create-session-form";

export const metadata: Metadata = { title: "セッションを作成" };

export default function NewSessionPage() {
  return (
    <div className="page-shell narrow-shell">
      <div className="page-intro">
        <div className="eyebrow">NEW SESSION</div>
        <h1>次の会話を準備する</h1>
        <p>テーマを入力すると、外部AIで使える汎用プロンプトを作ります。目的は任意です。</p>
      </div>
      <CreateSessionForm />
    </div>
  );
}
