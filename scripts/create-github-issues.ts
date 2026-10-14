/**
 * Script to batch create the 150 production deployment issues on GitHub
 * using the GitHub CLI (`gh`).
 *
 * Usage:
 *   npx tsx scripts/create-github-issues.ts [--dry-run]
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

interface Issue {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  priority: string;
  problem: string;
  specification: string;
  files: string;
  acceptanceCriteria: string[];
}

function parseRoadmap(filePath: string): Issue[] {
  const content = readFileSync(filePath, 'utf-8');
  const issueBlocks = content.split(/### (FE-\d+|BE-\d+|SC-\d+): /).slice(1);
  const issues: Issue[] = [];

  for (let i = 0; i < issueBlocks.length; i += 2) {
    const id = issueBlocks[i];
    const block = issueBlocks[i + 1];

    const lines = block.split('\n');
    const title = lines[0].trim();
    
    let category = '';
    let difficulty = '';
    let priority = '';
    let problem = '';
    let specification = '';
    let files = '';
    const acceptanceCriteria: string[] = [];

    let currentSection = '';

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (line.startsWith('- **Category:**')) {
        category = line.replace('- **Category:**', '').trim();
      } else if (line.startsWith('- **Difficulty:**')) {
        const parts = line.split('|');
        difficulty = parts[0]?.replace('- **Difficulty:**', '').trim() || '';
        priority = parts[1]?.replace('**Priority:**', '').trim() || '';
      } else if (line.startsWith('- **Problem Statement:**')) {
        problem = line.replace('- **Problem Statement:**', '').trim();
      } else if (line.startsWith('- **Specification:**')) {
        specification = line.replace('- **Specification:**', '').trim();
      } else if (line.startsWith('- **Files Involved:**')) {
        files = line.replace('- **Files Involved:**', '').trim();
      } else if (line.startsWith('- [ ]')) {
        acceptanceCriteria.push(line.replace('- [ ]', '').trim());
      }
    }

    issues.push({
      id,
      title,
      category,
      difficulty,
      priority,
      problem,
      specification,
      files,
      acceptanceCriteria,
    });
  }

  return issues;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const roadmapPath = path.resolve(process.cwd(), 'DEPLOYMENT_ISSUES_ROADMAP.md');
  const issues = parseRoadmap(roadmapPath);

  console.log(`Parsed ${issues.length} deployment issues from roadmap.`);

  for (const issue of issues) {
    const section = issue.id.startsWith('FE')
      ? 'Frontend'
      : issue.id.startsWith('BE')
      ? 'Backend'
      : 'Contract';

    const labelArgs = [
      `--label "${section.toLowerCase()}"`,
      `--label "production-readiness"`,
      issue.difficulty ? `--label "difficulty:${issue.difficulty.toLowerCase().trim()}"` : '',
      issue.priority ? `--label "priority:${issue.priority.toLowerCase().trim()}"` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const body = `## 📋 Overview
- **Identifier:** \`${issue.id}\`
- **Domain Category:** ${issue.category}
- **Difficulty:** ${issue.difficulty}
- **Deployment Priority:** ${issue.priority}

---

### 🚨 Problem Statement
${issue.problem}

---

### 🛠️ Technical Specification & Architecture
${issue.specification}

---

### 📂 Key Files Involved
${issue.files}

---

### ✅ Acceptance Criteria
${issue.acceptanceCriteria.map((ac) => `- [ ] ${ac}`).join('\n')}

---
*Created as part of the Web3 Student Lab Post-Wave Production Deployment Initiative.*`;

    const fullTitle = `[${issue.id}] ${issue.title}`;

    if (isDryRun) {
      console.log(`[DRY RUN] Would create: ${fullTitle} with labels: ${labelArgs}`);
    } else {
      console.log(`Creating: ${fullTitle}...`);
      try {
        const cmd = `gh issue create --title "${fullTitle.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}" ${labelArgs}`;
        const output = execSync(cmd, { encoding: 'utf-8' });
        console.log(`Created: ${output.trim()}`);
      } catch (err: any) {
        console.error(`Failed to create ${issue.id}:`, err?.message || err);
      }
    }
  }

  console.log('Done!');
}

main().catch(console.error);
