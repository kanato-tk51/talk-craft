"use client";

import { useFormStatus } from "react-dom";

import { deleteYoutubeMaterialAction } from "@/app/youtube/[materialId]/actions";

export function DeleteYoutubeMaterialButton({
  materialId,
  title,
}: {
  materialId: string;
  title: string;
}) {
  return (
    <form
      action={deleteYoutubeMaterialAction.bind(null, materialId)}
      onSubmit={(event) => {
        if (!window.confirm(`「${title}」を削除しますか？\n字幕・翻訳・重要表現も削除されます。`)) {
          event.preventDefault();
        }
      }}
    >
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button className="video-delete-button" type="submit" disabled={pending}>
      {pending ? "削除しています…" : "この教材を削除"}
    </button>
  );
}
