import { type ReactNode } from "react";

const URL_PATTERN = "https?://[^\\s<>\"')\\]]+";

function parseTextWithLinks(text: string): ReactNode[] {
  const regex = new RegExp(URL_PATTERN, "g");
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const url = match[0];
    const index = match.index;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const href = url.replace(/[.,;:!?)]+$/, "");

    parts.push(
      <a
        key={index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
      >
        {href}
      </a>
    );

    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function Linkify({ children }: { children: string }) {
  if (!children.includes("http")) {
    return <>{children}</>;
  }

  return <>{parseTextWithLinks(children)}</>;
}
