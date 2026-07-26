export type YoutubeImportActionState = {
  message: string;
  values: {
    youtubeUrl: string;
    title: string;
    channelName: string;
    transcript: string;
  };
  fieldErrors: {
    youtubeUrl?: string[];
    title?: string[];
    channelName?: string[];
    transcript?: string[];
  };
};

export type TranslationImportActionState = {
  message: string;
};

export type TranscriptEditActionState = {
  message: string;
};
