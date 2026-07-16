ALTER TABLE "youtube_materials" ALTER COLUMN "prompt_version" SET DEFAULT '2.0';--> statement-breakpoint
UPDATE "youtube_materials"
SET
	"translation_prompt" = replace(
		replace(
			"translation_prompt",
			E'- 各 [番号] を省略・結合せず、同じ番号で日本語訳を1件ずつ返してください。',
			E'- [番号] は字幕の取得単位であり、表示用の段落ではありません。すべての原文を順番どおり一度ずつ使いながら、話題・文意・話者の流れが自然になる位置で段落を組み直してください。\n- 各段落の source_en には、対応する英語原文を一字一句変えずにコピーしてください。段落間で原文を省略・重複させてはいけません。\n- 段落は機械的な固定長にせず、目安として2〜5文程度の読みやすい意味のまとまりにしてください。字幕の途中で文が切れている場合は、文が完結するところまで同じ段落にまとめてください。'
		),
		E'  "translation_segments": [\n    { "segment_number": 1, "translation_ja": "番号1の日本語訳" }\n  ],',
		E'  "translation_paragraphs": [\n    {\n      "paragraph_number": 1,\n      "source_en": "自然な段落に組み直した英語原文（文字は変更しない）",\n      "translation_ja": "その段落の日本語訳"\n    }\n  ],'
	),
	"prompt_version" = '2.0',
	"updated_at" = now()
WHERE "prompt_version" IN ('1.0', '1.1');
