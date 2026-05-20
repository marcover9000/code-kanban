import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function ensureGitignoreEntry(workspaceRoot: string, pattern: string): Promise<void> {
  const gitignorePath = join(workspaceRoot, '.gitignore');

  if (!existsSync(gitignorePath)) {
    const content = `# Code Kanban\n${pattern}\n`;
    writeFileSync(gitignorePath, content, 'utf8');
    return;
  }

  const current = readFileSync(gitignorePath, 'utf8');
  const alreadyPresent = current
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === pattern);

  if (alreadyPresent) {
    return;
  }

  const needsLeadingNewline = current.length > 0 && !current.endsWith('\n');
  const appendix = `${needsLeadingNewline ? '\n' : ''}${pattern}\n`;
  writeFileSync(gitignorePath, current + appendix, 'utf8');
}
