import { CopyButton } from "./copy-button";

export function PromptPanel({
  title,
  description,
  content,
  version,
}: {
  title: string;
  description: string;
  content: string;
  version: string;
}) {
  return (
    <section className="prompt-panel">
      <div className="prompt-heading">
        <div>
          <div className="eyebrow">GENERIC PROMPT · V{version}</div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <CopyButton text={content} />
      </div>
      <pre className="prompt-content">{content}</pre>
    </section>
  );
}
