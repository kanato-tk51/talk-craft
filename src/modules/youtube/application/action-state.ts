export type YoutubeImportActionState = {
  message: string;
  fieldErrors: { youtubeUrl?: string[] };
};

export type TranslationImportActionState = {
  message: string;
};
