import { ChatMessage, LectureSummaryData, StudySource } from '../types/study';

export type ExportFormat = 'md' | 'txt';

function slugifyFilename(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || 'study-session';
}

function getDateStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getReadableTimestamp(): string {
  return new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSummaryContent(
  summary: LectureSummaryData,
  source: StudySource | null,
  format: ExportFormat
): string {
  const exportedAt = getReadableTimestamp();
  const sourceTitle = source?.title || summary.topicTitle;

  if (format === 'md') {
    const lines: string[] = [
      `# ${summary.topicTitle}`,
      '',
      `> **Source:** ${sourceTitle}  `,
      `> **Difficulty:** ${summary.difficulty}  `,
      `> **Exported:** ${exportedAt}`,
      '',
      '## TL;DR',
      '',
      summary.tldr,
      '',
    ];

    if (summary.keyConcepts?.length > 0) {
      lines.push('## Key Concepts', '');
      for (const item of summary.keyConcepts) {
        lines.push(`- **${item.term}:** ${item.explanation}`);
      }
      lines.push('');
    }

    if (summary.formulasAndDefinitions?.length > 0) {
      lines.push('## Important Formulas & Definitions', '');
      for (const f of summary.formulasAndDefinitions) {
        lines.push(`### ${f.label}`, '');
        lines.push('```text', f.expression, '```', '');
        lines.push(f.meaning, '');
      }
    }

    if (summary.examTraps?.length > 0) {
      lines.push('## Potential Exam Traps', '');
      for (const trap of summary.examTraps) {
        lines.push(`- **Trap:** ${trap.trap}`);
        lines.push(`  - *How to avoid:* ${trap.howToAvoid}`);
      }
      lines.push('');
    }

    return lines.join('\n').trimEnd() + '\n';
  }

  // Plain Text (.txt)
  const lines: string[] = [
    summary.topicTitle.toUpperCase(),
    '='.repeat(Math.min(72, Math.max(24, summary.topicTitle.length))),
    `Source: ${sourceTitle}`,
    `Difficulty: ${summary.difficulty}`,
    `Exported: ${exportedAt}`,
    '',
    'TL;DR',
    '-----',
    summary.tldr,
    '',
  ];

  if (summary.keyConcepts?.length > 0) {
    lines.push('KEY CONCEPTS', '------------');
    for (const item of summary.keyConcepts) {
      lines.push(`* ${item.term}: ${item.explanation}`);
    }
    lines.push('');
  }

  if (summary.formulasAndDefinitions?.length > 0) {
    lines.push('IMPORTANT FORMULAS & DEFINITIONS', '--------------------------------');
    for (const f of summary.formulasAndDefinitions) {
      lines.push(`${f.label}`);
      lines.push(`  Formula: ${f.expression}`);
      lines.push(`  Meaning: ${f.meaning}`);
      lines.push('');
    }
  }

  if (summary.examTraps?.length > 0) {
    lines.push('POTENTIAL EXAM TRAPS', '--------------------');
    for (const trap of summary.examTraps) {
      lines.push(`* Trap: ${trap.trap}`);
      lines.push(`  How to avoid: ${trap.howToAvoid}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function formatChatContent(
  messages: ChatMessage[],
  source: StudySource | null,
  petName: string,
  format: ExportFormat
): string {
  const exportedAt = getReadableTimestamp();
  const sourceTitle = source?.title || 'Study Session';

  if (format === 'md') {
    const lines: string[] = [
      `# Tutor Chat History — ${sourceTitle}`,
      '',
      `> **Study Companion:** ${petName}  `,
      `> **Messages:** ${messages.length}  `,
      `> **Exported:** ${exportedAt}`,
      '',
    ];

    for (const msg of messages) {
      const speaker = msg.role === 'user' ? 'Student' : `${petName} (Tutor)`;
      lines.push(`### ${speaker}`, '', msg.text.trim(), '', '---', '');
    }

    return lines.join('\n').trimEnd() + '\n';
  }

  // Plain Text (.txt)
  const heading = `TUTOR CHAT HISTORY: ${sourceTitle}`;
  const lines: string[] = [
    heading,
    '='.repeat(Math.min(72, Math.max(24, heading.length))),
    `Study Companion: ${petName}`,
    `Messages: ${messages.length}`,
    `Exported: ${exportedAt}`,
    '',
  ];

  for (const msg of messages) {
    const speaker = msg.role === 'user' ? 'Student' : `${petName} (Tutor)`;
    lines.push(`[${speaker}]`, msg.text.trim(), '', '----------------------------------------', '');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function formatCombinedStudyPack(
  summary: LectureSummaryData | null,
  messages: ChatMessage[],
  source: StudySource | null,
  petName: string,
  format: ExportFormat
): string {
  const sections: string[] = [];

  if (summary) {
    sections.push(formatSummaryContent(summary, source, format).trimEnd());
  }

  if (messages.length > 0) {
    sections.push(formatChatContent(messages, source, petName, format).trimEnd());
  }

  const separator = format === 'md' ? '\n\n---\n\n' : '\n\n========================================\n\n';
  return sections.join(separator) + '\n';
}

export function downloadTextFile(filename: string, content: string, format: ExportFormat): void {
  const mimeType =
    format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSummaryFile(
  summary: LectureSummaryData,
  source: StudySource | null,
  format: ExportFormat
): string {
  const slug = slugifyFilename(summary.topicTitle || source?.title || 'lecture-summary');
  const filename = `pebble-summary-${slug}-${getDateStamp()}.${format}`;
  const content = formatSummaryContent(summary, source, format);
  downloadTextFile(filename, content, format);
  return filename;
}

export function exportChatFile(
  messages: ChatMessage[],
  source: StudySource | null,
  petName: string,
  format: ExportFormat
): string {
  const slug = slugifyFilename(source?.title || 'tutor-chat');
  const filename = `pebble-chat-${slug}-${getDateStamp()}.${format}`;
  const content = formatChatContent(messages, source, petName, format);
  downloadTextFile(filename, content, format);
  return filename;
}

export function exportCombinedStudyPack(
  summary: LectureSummaryData | null,
  messages: ChatMessage[],
  source: StudySource | null,
  petName: string,
  format: ExportFormat
): string {
  const slug = slugifyFilename(summary?.topicTitle || source?.title || 'study-pack');
  const filename = `pebble-study-notes-${slug}-${getDateStamp()}.${format}`;
  const content = formatCombinedStudyPack(summary, messages, source, petName, format);
  downloadTextFile(filename, content, format);
  return filename;
}
