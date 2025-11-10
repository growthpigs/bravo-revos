import React from 'react';

// Mock ReactMarkdown component for testing
const ReactMarkdown: React.FC<{
  children: string;
  components?: any;
}> = ({ children, components }) => {
  // Simple parsing for test purposes
  const parseMarkdown = (text: string) => {
    // Handle headings
    let parsed = text;

    // H1
    parsed = parsed.replace(/^#\s+(.+)$/gm, (match, p1) => {
      if (components?.h1) {
        return `<h1 class="text-6xl font-bold mb-8 text-gray-900">${p1}</h1>`;
      }
      return `<h1>${p1}</h1>`;
    });

    // H2
    parsed = parsed.replace(/^##\s+(.+)$/gm, (match, p1) => {
      if (components?.h2) {
        return `<h2 class="text-5xl font-bold mb-6 mt-10 text-gray-900">${p1}</h2>`;
      }
      return `<h2>${p1}</h2>`;
    });

    // H3
    parsed = parsed.replace(/^###\s+(.+)$/gm, (match, p1) => {
      if (components?.h3) {
        return `<h3 class="text-4xl font-semibold mb-4 mt-8 text-gray-900">${p1}</h3>`;
      }
      return `<h3>${p1}</h3>`;
    });

    // Bold
    parsed = parsed.replace(/\*\*(.+?)\*\*/g, (match, p1) => {
      if (components?.strong) {
        return `<strong class="font-bold text-inherit">${p1}</strong>`;
      }
      return `<strong>${p1}</strong>`;
    });

    // Links
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (components?.a) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline hover:no-underline text-inherit">${text}</a>`;
      }
      return `<a href="${url}">${text}</a>`;
    });

    // Lists (simplified)
    parsed = parsed.replace(/^-\s+(.+)$/gm, (match, p1) => {
      return `<li class="mb-0.5 text-inherit">${p1}</li>`;
    });

    // Wrap list items in ul if needed
    if (parsed.includes('<li')) {
      parsed = parsed.replace(/(<li[^>]*>.*<\/li>)+/gs, (match) => {
        return `<ul class="list-disc ml-4 my-2 space-y-1 text-inherit">${match}</ul>`;
      });
    }

    // Paragraphs
    const lines = parsed.split('\n');
    const processedLines = lines.map((line) => {
      if (
        !line.trim() ||
        line.includes('<h1') ||
        line.includes('<h2') ||
        line.includes('<h3') ||
        line.includes('<ul') ||
        line.includes('<li')
      ) {
        return line;
      }
      return `<p class="mb-2 last:mb-0 text-inherit">${line}</p>`;
    });

    parsed = processedLines.join('\n');

    // Remove horizontal rules if component is set to null
    if (components?.hr === null || (components?.hr && components.hr() === null)) {
      parsed = parsed.replace(/^---$/gm, '');
    }

    return parsed;
  };

  const parsedContent = parseMarkdown(children);

  return <div dangerouslySetInnerHTML={{ __html: parsedContent }} />;
};

export default ReactMarkdown;
