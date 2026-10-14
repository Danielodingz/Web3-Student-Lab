/**
 * Script to batch create the 150 production deployment issues on GitHub
 * using the GitHub CLI (`gh`).
 *
 * Usage:
 *   npx tsx scripts/create-github-issues.ts [--sample] [--dry-run] [--id FE-001]
 */

import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
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
  const isSample = process.argv.includes('--sample');
  const idArgIndex = process.argv.indexOf('--id');
  const targetId = idArgIndex !== -1 ? process.argv[idArgIndex + 1] : null;

  const roadmapPath = path.resolve(process.cwd(), 'DEPLOYMENT_ISSUES_ROADMAP.md');
  let issues = parseRoadmap(roadmapPath);

  if (targetId) {
    issues = issues.filter((iss) => iss.id === targetId);
  } else if (isSample) {
    // Pick 1 representative issue from each section: FE-001, BE-001, SC-001
    issues = issues.filter((iss) => ['FE-001', 'BE-001', 'SC-001'].includes(iss.id));
  }

  console.log(`Processing ${issues.length} deployment issue(s)...`);

  const tmpDir = path.resolve(process.cwd(), '.tmp_issues');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  for (const issue of issues) {
    const isFrontend = issue.id.startsWith('FE');
    const isBackend = issue.id.startsWith('BE');

    const labels = [
      isFrontend ? 'frontend' : isBackend ? 'backend' : 'smart-contract',
      isFrontend ? 'feature' : isBackend ? 'infrastructure' : 'soroban',
      'complexity-hard',
      'open-source-ready',
      'eta-2-days',
    ];

    const labelArgs = labels.map((l) => `--label "${l}"`).join(' ');

    const body = `## 📋 Overview
- **Identifier:** \`${issue.id}\`
- **Domain Category:** ${issue.category}
- **Difficulty:** ${issue.difficulty}
- **Deployment Priority:** ${issue.priority}
- **Estimated Time of Completion (ETA):** 2 Days (48 Hours)

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
    const tmpFile = path.join(tmpDir, `${issue.id}.md`);
    writeFileSync(tmpFile, body, 'utf-8');

    if (isDryRun) {
      console.log(`[DRY RUN] Would create: "${fullTitle}" with ${labelArgs}`);
    } else {
      console.log(`Pushing to GitHub: "${fullTitle}"...`);
      try {
        const cmd = `gh issue create --title "${fullTitle.replace(/"/g, '\\"')}" --body-file "${tmpFile}" ${labelArgs}`;
        const output = execSync(cmd, { encoding: 'utf-8' });
        console.log(` Created: ${output.trim()}`);
      } catch (err: any) {
        console.error(`❌ Failed to create ${issue.id}:`, err?.message || err);
      } finally {
        if (existsSync(tmpFile)) {
          unlinkSync(tmpFile);
        }
      }
    }
  }

  console.log('Finished!');
}

main().catch(console.error);
