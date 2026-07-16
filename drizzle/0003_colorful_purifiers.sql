ALTER TABLE "youtube_materials" ALTER COLUMN "prompt_version" SET DEFAULT '1.1';--> statement-breakpoint
UPDATE "youtube_materials"
SET
	"translation_prompt" = replace(
		"translation_prompt",
		E'- 重要表現は、汎用性が高い句動詞・慣用表現・自然な言い回しを最大12件選んでください。\n- 回答は',
		E'- 重要表現は、汎用性が高い句動詞・慣用表現・自然な言い回しを最大12件選んでください。\n- 各 expression_en は、字幕内に実際に登場する連続した文字列を、語形・語順を変えず原文どおり抜き出してください。本文上で強調表示するため、要約や言い換えは禁止です。\n- 回答は'
	),
	"prompt_version" = '1.1',
	"updated_at" = now()
WHERE "prompt_version" = '1.0';
