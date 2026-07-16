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

import { addKeyExpressionAction } from "@/app/youtube/[materialId]/actions";
import { type ExpressionRange, findExpressionRanges } from "../domain/expression-annotations";
import type {
  KeyExpression,
  TranscriptBlock,
  TranslationBlock,
  UserKeyExpressionInput,
} from "../domain/youtube-material";

type SelectionCandidate = {
  expressionEn: string;
  toolbarLeft: number;
  toolbarTop: number;
  commentTop: number;
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
  const [registrationError, setRegistrationError] = useState("");
  const [commentTop, setCommentTop] = useState(36);
  const [savingExpression, startSavingExpression] = useTransition();
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
    selectedAnnotationRef.current = annotation;
    alignCommentToElement(annotation);
    setSelectionCandidate(null);
    setRegistrationDraft(null);
    setRegistrationError("");
    setSelectedExpressionIndex(expressionIndex);
  }

  function captureSelection(container: HTMLElement) {
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

    const expressionEn = selection.toString().replaceAll(/\s+/g, " ").trim();
    if (!expressionEn || expressionEn.length > 1_000 || selection.rangeCount === 0) {
      setSelectionCandidate(null);
      return;
    }

    const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
    const layoutRect = layoutRef.current?.getBoundingClientRect();
    if (!layoutRect) return;

    setSelectionCandidate({
      expressionEn,
      toolbarLeft: Math.min(
        window.innerWidth - 110,
        Math.max(110, selectionRect.left + selectionRect.width / 2),
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

  useEffect(() => {
    function realignAfterResize() {
      if (selectedAnnotationRef.current) {
        alignCommentToElement(selectedAnnotationRef.current);
      }
    }
    function dismissSelectionToolbar() {
      setSelectionCandidate(null);
    }

    window.addEventListener("resize", realignAfterResize);
    window.addEventListener("scroll", dismissSelectionToolbar, true);
    return () => {
      window.removeEventListener("resize", realignAfterResize);
      window.removeEventListener("scroll", dismissSelectionToolbar, true);
    };
  }, [alignCommentToElement]);

  return (
    <section className="bilingual-section">
      <div className="section-title-row">
        <div>
          <div className="eyebrow">TRANSCRIPT & TRANSLATION</div>
          <h2>英語原文と日本語訳</h2>
          <p className="annotation-help">
            赤い下線の表現はクリックして解説を確認できます。原文を選択すると、自分でも重要表現を追加できます。
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
                {(sentencePairs.get(block.sequence) ?? []).map((pair, sentenceIndex) => (
                  <div
                    className="bilingual-sentence-pair"
                    key={`${block.sequence}-${pair.sourceStart}`}
                  >
                    <div lang="en">
                      {sentenceIndex === 0 ? <small>ENGLISH</small> : null}
                      <p
                        className="annotated-source-text"
                        onMouseUp={(event) => captureSelection(event.currentTarget)}
                        onTouchEnd={(event) => {
                          const container = event.currentTarget;
                          window.setTimeout(() => captureSelection(container), 0);
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
                      {sentenceIndex === 0 ? <small>日本語</small> : null}
                      <p>{pair.translationJa}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside
          className={`expression-comment-panel ${selectedExpression || registrationDraft ? "is-open" : ""}`}
          id="expression-comment-panel"
          aria-live="polite"
          style={{ "--expression-comment-top": `${commentTop}px` } as CSSProperties}
        >
          {selectedExpression && selectedExpressionIndex !== null ? (
            <ExpressionComment
              expression={selectedExpression}
              expressionIndex={selectedExpressionIndex}
              onClose={() => {
                selectedAnnotationRef.current = null;
                setSelectedExpressionIndex(null);
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
        </aside>
      </div>

      {selectionCandidate ? (
        <button
          className="selection-expression-action"
          type="button"
          style={{ left: selectionCandidate.toolbarLeft, top: selectionCandidate.toolbarTop }}
          onPointerDown={(event) => event.preventDefault()}
          onClick={beginExpressionRegistration}
        >
          ＋ 重要表現に追加
        </button>
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

  const sourceSentences = segmentSentences(sourceText, "en");
  if (!sourceSentences.length) return [];

  const translationText = translationBlock?.translationJa.trim() ?? "";
  const explicitLines = translationText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const translatedSentences =
    explicitLines.length > 1
      ? explicitLines
      : segmentSentences(translationText, "ja").map((sentence) => sentence.text);
  const distributedTranslations = distributeTranslations(
    translatedSentences,
    sourceSentences.length,
  );

  return sourceSentences.map((source, index) => ({
    sourceEn: source.text,
    translationJa: distributedTranslations[index] || (index === 0 ? "訳がありません" : ""),
    sourceStart: source.start,
    sourceEnd: source.end,
  }));
}

function locateSavedSentencePairs(
  sourceText: string,
  savedPairs: NonNullable<TranslationBlock["sentencePairs"]>,
): DisplaySentencePair[] | null {
  const displayPairs: DisplaySentencePair[] = [];
  let cursor = 0;
  for (const pair of savedPairs) {
    const sourceStart = sourceText.indexOf(pair.sourceEn, cursor);
    if (sourceStart < 0) return null;
    const sourceEnd = sourceStart + pair.sourceEn.length;
    displayPairs.push({
      sourceEn: pair.sourceEn,
      translationJa: pair.translationJa || "訳がありません",
      sourceStart,
      sourceEnd,
    });
    cursor = sourceEnd;
  }
  return displayPairs.length ? displayPairs : null;
}

function segmentSentences(value: string, locale: "en" | "ja") {
  if (!value.trim()) return [];
  return [...new Intl.Segmenter(locale, { granularity: "sentence" }).segment(value)].flatMap(
    (segment) => {
      const leadingWhitespace = segment.segment.length - segment.segment.trimStart().length;
      const text = segment.segment.trim();
      if (!text) return [];
      const start = segment.index + leadingWhitespace;
      return [{ text, start, end: start + text.length }];
    },
  );
}

function distributeTranslations(translations: string[], sourceCount: number): string[] {
  const distributed = Array.from({ length: sourceCount }, () => [] as string[]);
  if (!sourceCount || !translations.length) return distributed.map(() => "");

  translations.forEach((translation, index) => {
    const targetIndex = Math.min(
      sourceCount - 1,
      Math.floor((index * sourceCount) / translations.length),
    );
    distributed[targetIndex]?.push(translation);
  });
  return distributed.map((items) => items.join(""));
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
        onClick={(event) => {
          if (!window.getSelection()?.isCollapsed) return;
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

function ExpressionComment({
  expression,
  expressionIndex,
  onClose,
}: {
  expression: KeyExpression;
  expressionIndex: number;
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
