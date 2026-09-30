import * as React from "react";

/** Tiny safe renderer for CMS page bodies: "## heading", "### sub", "- list", blank line = paragraph. No raw HTML. */
export function SimpleMarkdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="prose-lite">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (/^###\s+/.test(lines[0])) return <h3 key={i}>{inline(lines[0].replace(/^###\s+/, ""))}</h3>;
        if (/^##\s+/.test(lines[0])) {
          const rest = lines.slice(1).join("\n");
          return (
            <React.Fragment key={i}>
              <h2>{inline(lines[0].replace(/^##\s+/, ""))}</h2>
              {rest && <p>{inline(rest)}</p>}
            </React.Fragment>
          );
        }
        return <p key={i}>{inline(lines.join("\n"))}</p>;
      })}
    </div>
  );
}

function inline(s: string): React.ReactNode {
  // **bold**
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="text-fg">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>));
}
