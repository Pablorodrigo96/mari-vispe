// Mention syntax: @mandate:UUID|Label  @buyer:UUID|Label  @company:CNPJ|Label
// Label is optional. Type maps: mandate→mandate, buyer→buyer_ma, company→company.

export type MentionType = "mandate" | "buyer" | "company";
export type MentionEntityType = "mandate" | "buyer_ma" | "company";

export interface ParsedMention {
  type: MentionType;
  entityType: MentionEntityType;
  ref: string;
  label?: string;
  raw: string;
}

const MENTION_RE = /@(mandate|buyer|company):([A-Za-z0-9-]+)(?:\|([^\s]+))?/g;

export function extractMentions(body: string): ParsedMention[] {
  if (!body) return [];
  const out: ParsedMention[] = [];
  const re = new RegExp(MENTION_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const type = m[1] as MentionType;
    out.push({
      type,
      entityType: type === "buyer" ? "buyer_ma" : type,
      ref: m[2],
      label: m[3] ? decodeURIComponent(m[3].replace(/_/g, " ")) : undefined,
      raw: m[0],
    });
  }
  return out;
}

export function mentionToRoute(type: MentionType, ref: string): string {
  switch (type) {
    case "mandate":
      return `/equity-brain/mandato/${ref}`;
    case "buyer":
      return `/equity-brain/buyer/${ref}`;
    case "company":
      return `/equity-brain/empresa/${ref}`;
  }
}

// Replace mention tokens with markdown links for ReactMarkdown rendering.
export function renderMentionsToMarkdown(body: string): string {
  if (!body) return "";
  return body.replace(MENTION_RE, (raw, type, ref, label) => {
    const display = label ? label.replace(/_/g, " ") : `@${type}:${ref}`;
    const route = mentionToRoute(type as MentionType, ref);
    return `[${display}](${route} "${type}")`;
  });
}

// Build a mention token from a picked entity. Labels get spaces→underscore to fit the token grammar.
export function buildMentionToken(type: MentionType, ref: string, label?: string | null): string {
  if (!label) return `@${type}:${ref}`;
  const safe = label.replace(/\s+/g, "_").replace(/\|/g, "");
  return `@${type}:${ref}|${safe}`;
}
