import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function MariMessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm break-words",
          isUser
            ? "bg-[#D9F564] text-[#0A0A0A]"
            : "bg-zinc-900 border border-zinc-800 text-zinc-100",
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{content || "..."}</div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-li:my-0.5 prose-headings:mt-2 prose-headings:mb-1">
            {content ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <span className="inline-flex gap-1 items-center text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9F564] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9F564] animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9F564] animate-pulse [animation-delay:300ms]" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
