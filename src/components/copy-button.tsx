"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "プロンプトをコピー",
}: {
  text: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      // Permission and browser policy failures fall back to a selected textarea below.
    }

    if (!copied) {
      copied = copyWithSelectedTextarea(text);
    }

    setStatus(copied ? "copied" : "failed");
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <button className="copy-button" type="button" onClick={copy}>
      {status === "copied"
        ? "コピーしました"
        : status === "failed"
          ? "選択してコピーしてください"
          : label}
    </button>
  );
}

function copyWithSelectedTextarea(text: string): boolean {
  const previouslyFocused = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto -9999px";
  textarea.style.fontSize = "16px";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
  }

  return copied;
}
