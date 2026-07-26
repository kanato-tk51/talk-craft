"use client";

import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  addKeyExpressionAction,
  deleteKeyExpressionAction,
  editTranscriptSelectionAction,
} from "@/app/youtube/[materialId]/actions";
import { type ExpressionRange, findExpressionRanges } from "../domain/expression-annotations";
import type {
  KeyExpression,
  TranscriptBlock,
  TranscriptSelectionEditInput,
  TranslationBlock,
  UserKeyExpressionInput,
} from "../domain/youtube-material";

type SelectionCandidate = {
  expressionEn: string;
  blockSequence: number;
  sourceStart: number;
  sourceEnd: number;
  originalText: string;
  toolbarLeft: number;
  toolbarTop: number;
  commentTop: number;
};

type TranscriptSelectionEditDraft = TranscriptSelectionEditInput;

type SelectionSnapshot = {
  anchorNode: Node | null;
  anchorOffset: number;
  focusNode: Node | null;
  focusOffset: number;
};

export function AnnotatedTranscript({
  materialId,
  transcriptBlocks,
  translationBlocks,
  keyExpressions,
  sourceUrl,
}: {
  materialId: string;
  transcriptBlocks: TranscriptBlock[];
  translationBlocks: TranslationBlock[];
  keyExpressions: KeyExpression[];
  sourceUrl: string;
}) {
  const router = useRouter();
  const [selectedExpressionIndex, setSelectedExpressionIndex] = useState<number | null>(null);
  const [selectionCandidate, setSelectionCandidate] = useState<SelectionCandidate | null>(null);
  const [registrationDraft, setRegistrationDraft] = useState<UserKeyExpressionInput | null>(null);
  const [editDraft, setEditDraft] = useState<TranscriptSelectionEditDraft | null>(null);
  const [registrationError, setRegistrationError] = useState("");
  const [editError, setEditError] = useState("");
  const [deletionError, setDeletionError] = useState("");
  const [commentTop, setCommentTop] = useState(36);
  const [savingExpression, startSavingExpression] = useTransition();
  const [savingEdit, startSavingEdit] = useTransition();
  const [deletingExpression, startDeletingExpression] = useTransition();
  const layoutRef = useRef<HTMLDivElement>(null);
  const selectedAnnotationRef = useRef<HTMLElement>(null);

  const usesAiParagraphs =
    translationBlocks.length > 0 && translationBlocks.every((block) => block.sourceEn);
  const displayBlocks = useMemo<TranscriptBlock[]>(
    () =>
      usesAiParagraphs
        ? translationBlocks.map((block) => ({
            sequence: block.sequence,
            startMs: block.startMs ?? transcriptBlocks[0]?.startMs ?? 0,
            text: block.sourceEn ?? "",
          }))
        : transcriptBlocks,
    [transcriptBlocks, translationBlocks, usesAiParagraphs],
  );
  const translations = useMemo(
    () => new Map(translationBlocks.map((block) => [block.sequence, block])),
    [translationBlocks],
  );
  const sentencePairs = useMemo(
    () =>
      new Map(
        displayBlocks.map((block) => [
          block.sequence,
          buildDisplaySentencePairs(block.text, translations.get(block.sequence)),
        ]),
      ),
    [displayBlocks, translations],
  );
  const annotations = useMemo(
    () =>
      new Map(
        displayBlocks.map((block) => [
          block.sequence,
          findExpressionRanges(block.text, keyExpressions),
        ]),
      ),
    [displayBlocks, keyExpressions],
  );
  const matchedExpressionCount = useMemo(
    () =>
      new Set(
        [...annotations.values()].flatMap((ranges) => ranges.map((range) => range.expressionIndex)),
      ).size,
    [annotations],
  );
  const selectedExpression =
    selectedExpressionIndex === null ? null : keyExpressions[selectedExpressionIndex];

  const alignCommentToElement = useCallback((element: HTMLElement) => {
    const layout = layoutRef.current;
    if (!layout) return;
    const elementRect = element.getBoundingClientRect();
    const layoutRect = layout.getBoundingClientRect();
    setCommentTop(elementRect.top - layoutRect.top + elementRect.height / 2);
  }, []);

  function selectExpression(expressionIndex: number, annotation: HTMLElement) {
    window.getSelection()?.removeAllRanges();
    if (
      selectedExpressionIndex === expressionIndex &&
      selectedAnnotationRef.current === annotation
    ) {
      selectedAnnotationRef.current = null;
      setSelectedExpressionIndex(null);
      setDeletionError("");
      return;
    }
    selectedAnnotationRef.current = annotation;
    alignCommentToElement(annotation);
    setSelectionCandidate(null);
    setRegistrationDraft(null);
    setEditDraft(null);
    setRegistrationError("");
    setEditError("");
    setDeletionError("");
    setSelectedExpressionIndex(expressionIndex);
  }

  function captureSelection(
    container: HTMLElement,
    blockSequence: number,
    sentenceSourceStart: number,
  ) {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !selection.anchorNode ||
      !selection.focusNode ||
      !container.contains(selection.anchorNode) ||
      !container.contains(selection.focusNode)
    ) {
      setSelectionCandidate(null);
      return;
    }

    if (selection.rangeCount === 0) {
      setSelectionCandidate(null);
      return;
    }

    const selectedRange = selection.getRangeAt(0);
    const offsets = selectionOffsetsWithin(container, selectedRange);
    if (!offsets) {
      setSelectionCandidate(null);
      return;
    }
    const containerText = container.textContent ?? "";
    const untrimmedText = containerText.slice(offsets.start, offsets.end);
    const leadingWhitespace = untrimmedText.length - untrimmedText.trimStart().length;
    const trailingWhitespace = untrimmedText.length - untrimmedText.trimEnd().length;
    const localStart = offsets.start + leadingWhitespace;
    const localEnd = offsets.end - trailingWhitespace;
    const originalText = containerText.slice(localStart, localEnd);
    const expressionEn = originalText.replaceAll(/\s+/g, " ").trim();
    if (!originalText || originalText.length > 1_000 || !expressionEn) {
      setSelectionCandidate(null);
      return;
    }

    const selectionRect = selectedRange.getBoundingClientRect();
    const layoutRect = layoutRef.current?.getBoundingClientRect();
    if (!layoutRect) return;

    setSelectionCandidate({
      expressionEn,
      blockSequence,
      sourceStart: sentenceSourceStart + localStart,
      sourceEnd: sentenceSourceStart + localEnd,
      originalText,
      toolbarLeft: Math.min(
        window.innerWidth - 130,
        Math.max(130, selectionRect.left + selectionRect.width / 2),
      ),
      toolbarTop: Math.max(12, selectionRect.top - 10),
      commentTop: selectionRect.top - layoutRect.top + selectionRect.height / 2,
    });
  }

  function beginExpressionRegistration() {
    if (!selectionCandidate) return;
    setSelectedExpressionIndex(null);
    selectedAnnotationRef.current = null;
    setCommentTop(selectionCandidate.commentTop);
    setRegistrationError("");
    setEditDraft(null);
    setEditError("");
    setRegistrationDraft({
      expressionEn: selectionCandidate.expressionEn,
      meaningJa: "",
      explanationJa: "",
      exampleEn: "",
      exampleJa: "",
    });
    setSelectionCandidate(null);
    window.getSelection()?.removeAllRanges();
  }

  function beginTranscriptSelectionEdit() {
    if (!selectionCandidate) return;
    setSelectedExpressionIndex(null);
    selectedAnnotationRef.current = null;
    setRegistrationDraft(null);
    setRegistrationError("");
    setCommentTop(selectionCandidate.commentTop);
    setEditError("");
    setEditDraft({
      blockSequence: selectionCandidate.blockSequence,
      sourceStart: selectionCandidate.sourceStart,
      sourceEnd: selectionCandidate.sourceEnd,
      originalText: selectionCandidate.originalText,
      replacementText: selectionCandidate.originalText,
    });
    setSelectionCandidate(null);
    window.getSelection()?.removeAllRanges();
  }

  function updateRegistration<Key extends keyof UserKeyExpressionInput>(
    key: Key,
    value: UserKeyExpressionInput[Key],
  ) {
    setRegistrationDraft((current) => (current ? { ...current, [key]: value } : null));
  }

  function saveSelectedExpression(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registrationDraft) return;
    setRegistrationError("");
    startSavingExpression(async () => {
      const result = await addKeyExpressionAction(materialId, registrationDraft);
      if (!result.success) {
        setRegistrationError(result.message);
        return;
      }
      setRegistrationDraft(null);
      router.refresh();
    });
  }

  function saveTranscriptSelectionEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editDraft) return;
    setEditError("");
    startSavingEdit(async () => {
      const result = await editTranscriptSelectionAction(materialId, editDraft);
      if (!result.success) {
        setEditError(result.message);
        return;
      }
      setEditDraft(null);
      router.refresh();
    });
  }

  function deleteSelectedExpression() {
    if (!selectedExpression) return;
    const expressionEn = selectedExpression.expressionEn;
    if (!window.confirm(`「${expressionEn}」を削除しますか？`)) return;

    setDeletionError("");
    startDeletingExpression(async () => {
      const result = await deleteKeyExpressionAction(materialId, expressionEn);
      if (!result.success) {
        setDeletionError(result.message);
        return;
      }
      selectedAnnotationRef.current = null;
      setSelectedExpressionIndex(null);
      router.refresh();
    });
  }

  useEffect(() => {
    function realignAfterResize() {
      if (selectedAnnotationRef.current) {
        alignCommentToElement(selectedAnnotationRef.current);
      }
    }
    function dismissSelectionToolbar() {
      setSelectionCandidate(null);
    }
    function dismissSelectionToolbarWhenSelectionIsEmpty() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setSelectionCandidate(null);
      }
    }

    window.addEventListener("resize", realignAfterResize);
    window.addEventListener("scroll", dismissSelectionToolbar, true);
    document.addEventListener("selectionchange", dismissSelectionToolbarWhenSelectionIsEmpty);
    return () => {
      window.removeEventListener("resize", realignAfterResize);
      window.removeEventListener("scroll", dismissSelectionToolbar, true);
      document.removeEventListener("selectionchange", dismissSelectionToolbarWhenSelectionIsEmpty);
    };
  }, [alignCommentToElement]);

  return (
    <section className="bilingual-section">
      <div className="section-title-row">
        <div>
          <div className="eyebrow">TRANSCRIPT & TRANSLATION</div>
          <h2>英語原文と日本語訳</h2>
          <p className="annotation-help">
            英語を選択すると、重要表現への登録または選択部分の編集を選べます。赤い下線の表現はクリックして解説を開閉できます。
          </p>
        </div>
        <span>
          {displayBlocks.length} paragraphs · {matchedExpressionCount} expressions
        </span>
      </div>

      <div className="annotated-transcript-layout" ref={layoutRef}>
        <div className="bilingual-list">
          {displayBlocks.map((block) => (
            <article className="bilingual-row" key={block.sequence}>
              <div className="segment-marker">
                <span>{String(block.sequence).padStart(2, "0")}</span>
                <a
                  href={`${sourceUrl}&t=${Math.floor(block.startMs / 1000)}s`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {timestamp(block.startMs)}
                </a>
              </div>
              <div className="bilingual-sentence-list">
                {(sentencePairs.get(block.sequence) ?? []).map((pair) => (
                  <div
                    className="bilingual-sentence-pair"
                    key={`${block.sequence}-${pair.sourceStart}`}
                  >
                    <div lang="en">
                      <p
                        className="annotated-source-text"
                        onMouseUp={(event) =>
                          captureSelection(event.currentTarget, block.sequence, pair.sourceStart)
                        }
                        onTouchEnd={(event) => {
                          const container = event.currentTarget;
                          window.setTimeout(
                            () => captureSelection(container, block.sequence, pair.sourceStart),
                            0,
                          );
                        }}
                      >
                        <HighlightedEnglish
                          text={pair.sourceEn}
                          ranges={rangesWithinSentence(
                            annotations.get(block.sequence) ?? [],
                            pair.sourceStart,
                            pair.sourceEnd,
                          )}
                          selectedExpressionIndex={selectedExpressionIndex}
                          onSelect={selectExpression}
                        />
                      </p>
                    </div>
                    <div lang="ja">
                      <p>{pair.translationJa}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside
          className={`expression-comment-panel ${
            selectedExpression || registrationDraft || editDraft ? "is-open" : ""
          }`}
          id="expression-comment-panel"
          aria-live="polite"
          style={{ "--expression-comment-top": `${commentTop}px` } as CSSProperties}
        >
          {selectedExpression && selectedExpressionIndex !== null ? (
            <ExpressionComment
              expression={selectedExpression}
              expressionIndex={selectedExpressionIndex}
              deletionError={deletionError}
              deleting={deletingExpression}
              onDelete={deleteSelectedExpression}
              onClose={() => {
                selectedAnnotationRef.current = null;
                setSelectedExpressionIndex(null);
                setDeletionError("");
              }}
            />
          ) : null}

          {registrationDraft ? (
            <form
              className="expression-comment-card expression-registration-card"
              onSubmit={saveSelectedExpression}
            >
              <div className="expression-comment-meta">
                <span>ADD EXPRESSION</span>
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationDraft(null);
                    setRegistrationError("");
                  }}
                  aria-label="表現の登録を閉じる"
                >
                  ×
                </button>
              </div>
              <h3 lang="en">{registrationDraft.expressionEn}</h3>
              {registrationError ? (
                <p className="field-error" role="alert">
                  {registrationError}
                </p>
              ) : null}
              <label>
                <span>日本語の意味（任意）</span>
                <input
                  value={registrationDraft.meaningJa}
                  onChange={(event) => updateRegistration("meaningJa", event.target.value)}
                  maxLength={1000}
                />
              </label>
              <label>
                <span>ニュアンス・使い方（任意）</span>
                <textarea
                  value={registrationDraft.explanationJa}
                  onChange={(event) => updateRegistration("explanationJa", event.target.value)}
                  maxLength={3000}
                  rows={3}
                />
              </label>
              <div className="expression-registration-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setRegistrationDraft(null)}
                  disabled={savingExpression}
                >
                  キャンセル
                </button>
                <button className="button button-primary" type="submit" disabled={savingExpression}>
                  {savingExpression ? "追加しています…" : "赤い表現として追加"}
                </button>
              </div>
            </form>
          ) : null}

          {editDraft ? (
            <form
              className="expression-comment-card expression-registration-card transcript-selection-edit-card"
              onSubmit={saveTranscriptSelectionEdit}
            >
              <div className="expression-comment-meta">
                <span>EDIT TRANSCRIPT</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditDraft(null);
                    setEditError("");
                  }}
                  aria-label="英語字幕の編集を閉じる"
                >
                  ×
                </button>
              </div>
              <div>
                <small>選択した英語</small>
                <h3 lang="en">{editDraft.originalText}</h3>
              </div>
              {editError ? (
                <p className="field-error" role="alert">
                  {editError}
                </p>
              ) : null}
              <label>
                <span>修正後の英語</span>
                <textarea
                  value={editDraft.replacementText}
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current ? { ...current, replacementText: event.target.value } : null,
                    )
                  }
                  maxLength={1000}
                  rows={3}
                  required
                  spellCheck
                />
              </label>
              <p className="transcript-selection-edit-note">
                要約と日本語訳はそのまま残ります。意味が変わる修正の場合は、保存後に翻訳を作り直してください。
              </p>
              <div className="expression-registration-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setEditDraft(null)}
                  disabled={savingEdit}
                >
                  キャンセル
                </button>
                <button className="button button-primary" type="submit" disabled={savingEdit}>
                  {savingEdit ? "保存しています…" : "選択部分を保存"}
                </button>
              </div>
            </form>
          ) : null}
        </aside>
      </div>

      {selectionCandidate ? (
        <div
          className="selection-text-actions"
          style={{ left: selectionCandidate.toolbarLeft, top: selectionCandidate.toolbarTop }}
          onPointerDown={(event) => event.preventDefault()}
        >
          <button type="button" onClick={beginExpressionRegistration}>
            ＋ 重要表現に追加
          </button>
          <button type="button" onClick={beginTranscriptSelectionEdit}>
            ✎ 選択部分を編集
          </button>
        </div>
      ) : null}
    </section>
  );
}

type DisplaySentencePair = {
  sourceEn: string;
  translationJa: string;
  sourceStart: number;
  sourceEnd: number;
};

function buildDisplaySentencePairs(
  sourceText: string,
  translationBlock: TranslationBlock | undefined,
): DisplaySentencePair[] {
  const savedPairs = translationBlock?.sentencePairs;
  const savedDisplayPairs = savedPairs ? locateSavedSentencePairs(sourceText, savedPairs) : null;
  if (savedDisplayPairs) return savedDisplayPairs;

  const translationText = translationBlock?.translationJa.trim() ?? "";
  if (!sourceText.trim()) return [];
  return [
    {
      sourceEn: sourceText,
      translationJa: translationText || "訳がありません",
      sourceStart: 0,
      sourceEnd: sourceText.length,
    },
  ];
}

function locateSavedSentencePairs(
  sourceText: string,
  savedPairs: NonNullable<TranslationBlock["sentencePairs"]>,
): DisplaySentencePair[] | null {
  const displayPairs: DisplaySentencePair[] = [];
  let cursor = 0;
  for (const pair of savedPairs) {
    const sourceStart = sourceText.indexOf(pair.sourceEn, cursor);
    if (sourceStart < 0 || sourceText.slice(cursor, sourceStart).trim()) return null;
    const sourceEnd = sourceStart + pair.sourceEn.length;
    displayPairs.push({
      sourceEn: pair.sourceEn,
      translationJa: pair.translationJa || "訳がありません",
      sourceStart,
      sourceEnd,
    });
    cursor = sourceEnd;
  }
  return displayPairs.length && !sourceText.slice(cursor).trim() ? displayPairs : null;
}

function rangesWithinSentence(
  ranges: ExpressionRange[],
  sentenceStart: number,
  sentenceEnd: number,
): ExpressionRange[] {
  return ranges
    .filter((range) => range.end > sentenceStart && range.start < sentenceEnd)
    .map((range) => ({
      ...range,
      start: Math.max(range.start, sentenceStart) - sentenceStart,
      end: Math.min(range.end, sentenceEnd) - sentenceStart,
    }));
}

function HighlightedEnglish({
  text,
  ranges,
  selectedExpressionIndex,
  onSelect,
}: {
  text: string;
  ranges: ReturnType<typeof findExpressionRanges>;
  selectedExpressionIndex: number | null;
  onSelect: (expressionIndex: number, annotation: HTMLElement) => void;
}) {
  const selectionAtPointerDownRef = useRef<SelectionSnapshot | null>(null);

  if (!ranges.length) return text;

  const content: React.ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) {
      content.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor, range.start)}</Fragment>);
    }
    const matchedText = text.slice(range.start, range.end);
    content.push(
      // biome-ignore lint/a11y/useSemanticElements: a semantic button is an atomic box and cannot wrap a long phrase naturally with the surrounding transcript.
      <span
        className={`expression-annotation ${selectedExpressionIndex === range.expressionIndex ? "is-active" : ""}`}
        role="button"
        tabIndex={0}
        onPointerDown={() => {
          selectionAtPointerDownRef.current = snapshotSelection(window.getSelection());
        }}
        onClick={(event) => {
          const selection = window.getSelection();
          const selectionExistedBeforeClick = matchesSelectionSnapshot(
            selection,
            selectionAtPointerDownRef.current,
          );
          selectionAtPointerDownRef.current = null;
          if (selection && !selection.isCollapsed && !selectionExistedBeforeClick) return;
          onSelect(range.expressionIndex, event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onSelect(range.expressionIndex, event.currentTarget);
        }}
        aria-controls="expression-comment-panel"
        aria-expanded={selectedExpressionIndex === range.expressionIndex}
        aria-label={`${matchedText}の解説を表示`}
        key={`expression-${range.start}-${range.end}`}
      >
        {matchedText}
      </span>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) {
    content.push(<Fragment key={`text-${cursor}`}>{text.slice(cursor)}</Fragment>);
  }
  return content;
}

function snapshotSelection(selection: Selection | null): SelectionSnapshot | null {
  if (!selection || selection.isCollapsed) return null;
  return {
    anchorNode: selection.anchorNode,
    anchorOffset: selection.anchorOffset,
    focusNode: selection.focusNode,
    focusOffset: selection.focusOffset,
  };
}

function selectionOffsetsWithin(
  container: HTMLElement,
  selectedRange: Range,
): { start: number; end: number } | null {
  if (
    !container.contains(selectedRange.startContainer) ||
    !container.contains(selectedRange.endContainer)
  ) {
    return null;
  }

  const rangeBeforeStart = document.createRange();
  rangeBeforeStart.selectNodeContents(container);
  rangeBeforeStart.setEnd(selectedRange.startContainer, selectedRange.startOffset);
  const rangeBeforeEnd = document.createRange();
  rangeBeforeEnd.selectNodeContents(container);
  rangeBeforeEnd.setEnd(selectedRange.endContainer, selectedRange.endOffset);
  return {
    start: rangeBeforeStart.toString().length,
    end: rangeBeforeEnd.toString().length,
  };
}

function matchesSelectionSnapshot(
  selection: Selection | null,
  snapshot: SelectionSnapshot | null,
): boolean {
  return Boolean(
    selection &&
      !selection.isCollapsed &&
      snapshot &&
      selection.anchorNode === snapshot.anchorNode &&
      selection.anchorOffset === snapshot.anchorOffset &&
      selection.focusNode === snapshot.focusNode &&
      selection.focusOffset === snapshot.focusOffset,
  );
}

function ExpressionComment({
  expression,
  expressionIndex,
  deletionError,
  deleting,
  onDelete,
  onClose,
}: {
  expression: KeyExpression;
  expressionIndex: number;
  deletionError: string;
  deleting: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="expression-comment-card">
      <div className="expression-comment-meta">
        <span>
          {expression.origin === "user"
            ? "YOUR EXPRESSION"
            : `EXPRESSION ${String(expressionIndex + 1).padStart(2, "0")}`}
        </span>
        <button type="button" onClick={onClose} aria-label="表現の解説を閉じる">
          ×
        </button>
      </div>
      <h3 lang="en">{expression.expressionEn}</h3>
      {expression.meaningJa ? <strong>{expression.meaningJa}</strong> : null}
      {expression.explanationJa ? <p>{expression.explanationJa}</p> : null}
      {expression.exampleEn ? (
        <div className="expression-comment-example">
          <span>EXAMPLE</span>
          <p lang="en">{expression.exampleEn}</p>
          <small>{expression.exampleJa}</small>
        </div>
      ) : null}
      {deletionError ? (
        <p className="expression-delete-error" role="alert">
          {deletionError}
        </p>
      ) : null}
      <div className="expression-delete-actions">
        <button type="button" onClick={onDelete} disabled={deleting}>
          {deleting ? "削除しています…" : "この表現を削除"}
        </button>
      </div>
    </div>
  );
}

function timestamp(startMs: number): string {
  const totalSeconds = Math.floor(startMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
