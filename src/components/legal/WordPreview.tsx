import ReactMarkdown from "react-markdown";

interface Props {
  body: string;
  title?: string;
  className?: string;
}

/**
 * Renders legal document body as a Word-like A4 page:
 * white paper, serif typography, justified paragraphs, 1" margins.
 */
export function WordPreview({ body, title, className = "" }: Props) {
  return (
    <div className={`bg-zinc-200/40 dark:bg-zinc-900/40 p-4 sm:p-8 rounded ${className}`}>
      <div
        className="mx-auto bg-white shadow-2xl rounded-sm"
        style={{
          maxWidth: "816px",
          minHeight: "1056px",
          padding: "72px 96px",
          color: "#1a1a1a",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "11pt",
          lineHeight: 1.6,
        }}
      >
        {title && (
          <div
            style={{
              textAlign: "center",
              fontSize: "14pt",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "32px",
              paddingBottom: "16px",
              borderBottom: "2px solid #1a1a1a",
            }}
          >
            {title}
          </div>
        )}
        <article
          className="word-preview-body"
          style={{ textAlign: "justify" }}
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 style={{ fontSize: "16pt", fontWeight: 700, textAlign: "center", marginTop: "24px", marginBottom: "16px", textTransform: "uppercase" }}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ fontSize: "13pt", fontWeight: 700, marginTop: "20px", marginBottom: "10px", textAlign: "center", textTransform: "uppercase" }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ fontSize: "12pt", fontWeight: 700, marginTop: "18px", marginBottom: "8px" }}>
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 style={{ fontSize: "11pt", fontWeight: 700, marginTop: "14px", marginBottom: "6px" }}>
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p style={{ marginBottom: "12px", textIndent: "0", textAlign: "justify" }}>{children}</p>
              ),
              ul: ({ children }) => <ul style={{ marginLeft: "24px", marginBottom: "12px", listStyle: "disc" }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ marginLeft: "24px", marginBottom: "12px", listStyle: "decimal" }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
              strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
              em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
              hr: () => <hr style={{ border: "none", borderTop: "1px solid #999", margin: "24px 0" }} />,
              blockquote: ({ children }) => (
                <blockquote style={{ borderLeft: "3px solid #999", paddingLeft: "16px", margin: "16px 0", fontStyle: "italic", color: "#444" }}>
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "10pt" }}>{children}</table>
              ),
              th: ({ children }) => <th style={{ border: "1px solid #999", padding: "6px 8px", background: "#f0f0f0", textAlign: "left" }}>{children}</th>,
              td: ({ children }) => <td style={{ border: "1px solid #999", padding: "6px 8px" }}>{children}</td>,
            }}
          >
            {body || "*Documento vazio.*"}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
