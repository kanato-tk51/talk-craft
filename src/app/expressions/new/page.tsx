import type { Metadata } from "next";
import { z } from "zod";

import { ExpressionForm } from "@/modules/expressions/ui/expression-form";

export const metadata: Metadata = { title: "表現を登録" };

export default async function NewExpressionPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const requestedSessionId = (await searchParams).sessionId;
  const returnToSessionId = z.uuid().safeParse(requestedSessionId).success
    ? requestedSessionId
    : undefined;

  return (
    <div className="page-shell narrow-shell">
      <div className="page-intro">
        <div className="eyebrow">NEW EXPRESSION</div>
        <h1>表現を登録する</h1>
        <p>会話セッションとは独立して保存され、複数のセッションや復習で再利用できます。</p>
      </div>
      <ExpressionForm returnToSessionId={returnToSessionId} />
    </div>
  );
}
