/**
 * Export utilities for workspaces
 * Supports: JSON, Markdown, CSV, PNG
 */

import type { Artifact } from '@/lib/artifacts/types';

export function exportAsJSON(artifacts: Record<string, Artifact>): string {
  const data = Object.values(artifacts).map(a => ({
    id: a.id,
    type: a.type,
    title: a.title,
    state: a.state,
    createdAt: a.createdAt,
  }));
  return JSON.stringify(data, null, 2);
}

export function exportAsMarkdown(artifacts: Record<string, Artifact>): string {
  const sections = Object.values(artifacts).map(a => {
    let content = `## ${a.title || a.type}\n\n`;
    content += `**Type:** ${a.type}\n`;
    content += `**Created:** ${new Date(a.createdAt).toLocaleString()}\n\n`;

    // Format state based on type
    if (a.type === 'ExecutionPlan' && 'steps' in a.state) {
      content += `### Steps\n`;
      (a.state as any).steps?.forEach((step: any, i: number) => {
        content += `${i + 1}. **${step.action}** - ${step.description}\n`;
        if (step.estimated_time) content += `   ⏱️ ${step.estimated_time}\n`;
      });
    } else if (a.type === 'KanbanBoard' && 'columns' in a.state) {
      content += `### Tasks\n`;
      (a.state as any).columns?.forEach((col: any) => {
        content += `\n**${col.title}** (${col.tasks.length} tasks)\n`;
        col.tasks?.forEach((task: any) => {
          content += `- ${task.title}`;
          if (task.priority) content += ` [${task.priority.toUpperCase()}]`;
          if (task.dueDate) content += ` (Due: ${task.dueDate})`;
          content += `\n`;
        });
      });
    } else {
      content += `\`\`\`json\n${JSON.stringify(a.state, null, 2)}\n\`\`\`\n`;
    }

    return content;
  });

  return `# Workspace Export\n\nExported: ${new Date().toLocaleString()}\n\n${sections.join('\n---\n\n')}`;
}

export function exportAsCSV(artifacts: Record<string, Artifact>): string {
  const rows: string[] = [['ID', 'Type', 'Title', 'Created', 'Status'].join(',')];

  Object.values(artifacts).forEach(a => {
    const status = (a.state as any).status || 'active';
    rows.push([a.id, a.type, a.title || '', new Date(a.createdAt).toISOString(), status].map(v => `"${v}"`).join(','));
  });

  return rows.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(content: string) {
  navigator.clipboard.writeText(content).catch(err => {
    console.error('Failed to copy:', err);
  });
}

export async function exportAsPNG(element: HTMLElement, filename: string) {
  try {
    const canvas = await html2canvas(element);
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = filename;
    link.click();
  } catch (err) {
    console.error('Failed to export PNG:', err);
  }
}
