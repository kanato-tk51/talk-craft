import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { archiveExpressionAction } from "@/app/expressions/actions";
import { getExpression } from "@/modules/expressions/application/expression-service";
import { ExpressionForm } from "@/modules/expressions/ui/expression-form";

export const metadata: Metadata = { title: "表現を編集" };
export const dynamic = "force-dynamic";

export default async function EditExpressionPage({
  params,
  searchParams,
}: {
  params: Promise<{ expressionId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { expressionId } = await params;
  if (!z.uuid().safeParse(expressionId).success) {
    notFound();
  }

  const expression = await getExpression(expressionId);
  if (!expression || expression.learningStatus === "archived") {
    notFound();
  }
  const requestedSessionId = (await searchParams).sessionId;
  const returnToSessionId = z.uuid().safeParse(requestedSessionId).success
    ? requestedSessionId
    : undefined;

  return (
    <div className="page-shell narrow-shell">
      <div className="page-intro split-intro">
        <div>
          <div className="eyebrow">EDIT EXPRESSION</div>
          <h1>表現を編集する</h1>
          <p>変更内容は表現ライブラリへ反映されます。過去の生成プロンプトは変更されません。</p>
        </div>
        <form action={archiveExpressionAction.bind(null, expression.id)}>
          {returnToSessionId ? (
            <input name="returnToSessionId" type="hidden" value={returnToSessionId} />
          ) : null}
          <button className="danger-link" type="submit">
            ライブラリから削除
          </button>
        </form>
      </div>
      <ExpressionForm
        expressionId={expression.id}
        returnToSessionId={returnToSessionId}
        initialValues={{
          expressionEn: expression.expressionEn,
          meaningJa: expression.meaningJa,
          alternativeExpressions: expression.alternativeExpressions.join("\n"),
          examples: expression.examples.join("\n"),
          relatedWords: expression.relatedWords.join("\n"),
          usageNotes: expression.usageNotes,
          pronunciationNotes: expression.pronunciationNotes,
          learningStatus: expression.learningStatus,
          priority: expression.priority,
        }}
      />
    </div>
  );
}
