"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is not available");
      }
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <button className="copy-button" type="button" onClick={copy}>
      {status === "copied"
        ? "コピーしました"
        : status === "failed"
          ? "選択してコピーしてください"
          : "プロンプトをコピー"}
    </button>
  );
}
