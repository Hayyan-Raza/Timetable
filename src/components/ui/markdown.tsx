import React from 'react';

interface MarkdownProps {
    content: string;
    className?: string;
}

export function Markdown({ content, className = '' }: MarkdownProps) {
    // Simple markdown parser for common formatting
    const parseMarkdown = (text: string) => {
        // Split by lines to handle lists
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let inTable = false;
        let tableRows: string[] = [];

        const renderTable = (rows: string[], key: number) => {
            if (rows.length < 2) return null; // Need at least header and separator

            const headers = rows[0].split('|').map(h => h.trim()).filter(Boolean);
            const dataRows = rows.slice(2); // Skip separator row

            return (
                <div key={key} className="overflow-x-auto my-3">
                    <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                            <tr>
                                {headers.map((header, idx) => (
                                    <th key={idx} className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-left text-sm font-semibold">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataRows.map((row, rowIdx) => {
                                const cells = row.split('|').map(c => c.trim()).filter(Boolean);
                                return (
                                    <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        {cells.map((cell, cellIdx) => (
                                            <td key={cellIdx} className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        };

        const parseInlineFormatting = (text: string): string => {
            let parsed = text;

            // Bold: **text** or __text__ (do bold first to avoid conflict with italic)
            parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
            parsed = parsed.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>');

            // Italic: *text* or _text_
            parsed = parsed.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
            parsed = parsed.replace(/_(.+?)_/g, '<em class="italic">$1</em>');

            // Inline code: `code`
            parsed = parsed.replace(/`(.+?)`/g, '<code class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono mx-0.5">$1</code>');

            // Links: [text](url)
            parsed = parsed.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-700">$1</a>');

            return parsed;
        };

        lines.forEach((line, idx) => {
            // Detect table rows (lines with |)
            if (line.includes('|') && line.split('|').length > 2) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                tableRows.push(line);
                return;
            } else if (inTable) {
                // End of table
                elements.push(renderTable(tableRows, elements.length));
                inTable = false;
                tableRows = [];
            }

            // Unordered lists: - item or * item
            if (line.match(/^[\-\*]\s+(.+)/)) {
                const listItem = line.replace(/^[\-\*]\s+/, '');
                const parsed = parseInlineFormatting(listItem);
                elements.push(
                    <li key={idx} className="ml-4 mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: parsed }} />
                );
                return;
            }

            // Ordered lists: 1. item
            if (line.match(/^\d+\.\s+(.+)/)) {
                const listItem = line.replace(/^\d+\.\s+/, '');
                const parsed = parseInlineFormatting(listItem);
                elements.push(
                    <li key={idx} className="ml-4 mb-1 list-decimal leading-relaxed" dangerouslySetInnerHTML={{ __html: parsed }} />
                );
                return;
            }

            // Headers: # H1, ## H2, ### H3
            if (line.startsWith('### ')) {
                const text = parseInlineFormatting(line.replace('### ', ''));
                elements.push(
                    <h3 key={idx} className="font-semibold text-base mt-3 mb-2" dangerouslySetInnerHTML={{ __html: text }} />
                );
                return;
            }
            if (line.startsWith('## ')) {
                const text = parseInlineFormatting(line.replace('## ', ''));
                elements.push(
                    <h2 key={idx} className="font-semibold text-lg mt-3 mb-2" dangerouslySetInnerHTML={{ __html: text }} />
                );
                return;
            }
            if (line.startsWith('# ')) {
                const text = parseInlineFormatting(line.replace('# ', ''));
                elements.push(
                    <h1 key={idx} className="font-bold text-xl mt-4 mb-2" dangerouslySetInnerHTML={{ __html: text }} />
                );
                return;
            }

            // Regular paragraph
            if (line.trim()) {
                const parsed = parseInlineFormatting(line);
                elements.push(
                    <p key={idx} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: parsed }} />
                );
            } else {
                elements.push(<div key={idx} className="h-2" />);
            }
        });

        // Handle table at end of content
        if (inTable && tableRows.length > 0) {
            elements.push(renderTable(tableRows, elements.length));
        }

        return elements;
    };

    return (
        <div className={`markdown-content space-y-1 ${className}`}>
            {parseMarkdown(content)}
        </div>
    );
}
