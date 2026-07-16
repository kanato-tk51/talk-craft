"use client";

import { useFormStatus } from "react-dom";

import { regenerateAutomaticTranslationAction } from "@/app/youtube/[materialId]/actions";

export function RegenerateYoutubeTranslationButton({
  materialId,
  title,
}: {
  materialId: string;
  title: string;
}) {
  return (
    <form
      action={regenerateAutomaticTranslationAction.bind(null, materialId)}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `「${title}」の日本語訳とAI生成表現を作り直しますか？\n自分で追加した表現は保持されます。`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <RegenerateButton />
    </form>
  );
}

function RegenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button className="video-regenerate-button" type="submit" disabled={pending}>
      {pending ? "再生成を開始しています…" : "訳と対応関係を再生成"}
    </button>
  );
}
