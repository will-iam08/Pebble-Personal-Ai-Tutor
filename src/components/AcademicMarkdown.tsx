import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface AcademicMarkdownProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Normalize common LLM LaTeX delimiters (\( ... \), \[ ... \]) to $ ... $ / $$ ... $$
 * so remark-math + KaTeX render equations consistently across all providers.
 */
function normalizeMathDelimiters(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `\n$$\n${inner.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner.trim()}$`);
}

export const AcademicMarkdown: React.FC<AcademicMarkdownProps> = ({
  content,
  className = '',
  inline = false,
}) => {
  const normalized = useMemo(() => normalizeMathDelimiters(content), [content]);

  return (
    <div className={`pebble-markdown ${inline ? 'pebble-markdown-inline' : ''} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) =>
            inline ? (
              <span>{children}</span>
            ) : (
              <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
            ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[#182026] dark:text-[#F1F3F5]">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#E86A33]/70 pl-2.5 my-2 italic opacity-90">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClass, children }) => {
            const isBlock = Boolean(codeClass && codeClass.includes('language-'));
            if (isBlock) {
              return (
                <code className="block font-mono text-[11px] leading-relaxed">{children}</code>
              );
            }
            return (
              <code className="px-1 py-0.5 rounded bg-[#EDF1F5] dark:bg-[#10161B] font-mono text-[11px] text-[#1D3B2E] dark:text-[#8FD8B5]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-2 p-2.5 rounded-lg bg-[#F2F5F8] dark:bg-[#10161B] border border-[#DCE2E8] dark:border-[#26343E] overflow-x-auto text-[11px] font-mono">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[#D4DCE3] dark:border-[#2E3D48] bg-[#F2F5F8] dark:bg-[#131B21] px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[#D4DCE3] dark:border-[#2E3D48] px-2 py-1">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[#E86A33] underline hover:opacity-85"
            >
              {children}
            </a>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
};
