import ReactMarkdown from "react-markdown";
import { renderMentionsToMarkdown } from "@/lib/eb/mentionParser";

interface Props {
  body: string;
  className?: string;
}

const TYPE_COLOR: Record<string, string> = {
  mandate: "text-emerald-300 bg-emerald-900/20 border-emerald-800/50",
  buyer: "text-violet-300 bg-violet-900/20 border-violet-800/50",
  company: "text-amber-300 bg-amber-900/20 border-amber-800/50",
};

export function NoteRenderer({ body, className }: Props) {
  const md = renderMentionsToMarkdown(body);
  return (
    <div
      className={
        className ??
        "prose prose-invert prose-sm max-w-none text-zinc-300 text-xs break-words [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&_a]:text-emerald-400"
      }
    >
      <ReactMarkdown
        components={{
          a: ({ href, title, children }) => {
            const isMention = title && ["mandate", "buyer", "company"].includes(title);
            if (isMention) {
              return (
                <a
                  href={href ?? "#"}
                  className={`inline-flex items-center gap-0.5 px-1 py-px rounded border text-[11px] no-underline ${TYPE_COLOR[title!] ?? ""}`}
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href ?? "#"} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
