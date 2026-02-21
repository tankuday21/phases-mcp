import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';

// ─── phases_clarify ─────────────────────────────────────────────

export interface ClarifyInput {
    description: string;
    project_type?: 'web-app' | 'api' | 'cli' | 'library' | 'mobile' | 'other';
    answers?: Array<{ question: string; answer: string }>;
    working_directory?: string;
}

interface ClarifyQuestion {
    category: string;
    question: string;
    why: string;
}

function generateQuestions(description: string, projectType?: string): ClarifyQuestion[] {
    const questions: ClarifyQuestion[] = [];
    const descLower = description.toLowerCase();

    // ─── Scope & Vision Questions ────────────────────────────────
    questions.push({
        category: '🎯 Scope',
        question: 'What is the single most important thing this project must do to be considered a success?',
        why: 'Helps define the #1 success criteria and prevents scope creep',
    });

    questions.push({
        category: '🎯 Scope',
        question: 'What should this project explicitly NOT do? (What\'s out of scope?)',
        why: 'Non-goals are as important as goals — they prevent overengineering',
    });

    // ─── User & Audience Questions ───────────────────────────────
    questions.push({
        category: '👤 Users',
        question: 'Who is the primary user of this? (e.g., developers, end-users, internal team, yourself)',
        why: 'User type determines UX complexity, error handling, and documentation needs',
    });

    if (descLower.includes('app') || descLower.includes('web') || descLower.includes('ui') || descLower.includes('frontend')) {
        questions.push({
            category: '👤 Users',
            question: 'How many concurrent users do you expect? (Just you, <100, 100-10K, 10K+)',
            why: 'Scale requirements affect architecture decisions early',
        });
    }

    // ─── Technical Questions ─────────────────────────────────────
    if (!projectType || projectType === 'other') {
        questions.push({
            category: '🔧 Technical',
            question: 'What type of project is this? (web-app, API, CLI tool, library, mobile app)',
            why: 'Project type determines the tech stack and architecture patterns',
        });
    }

    questions.push({
        category: '🔧 Technical',
        question: 'Do you have any tech stack preferences or constraints? (e.g., must use React, needs Python, must run on AWS)',
        why: 'Avoids rebuilding work and ensures compatibility with existing systems',
    });

    if (descLower.includes('data') || descLower.includes('database') || descLower.includes('store') || descLower.includes('save')) {
        questions.push({
            category: '🔧 Technical',
            question: 'What kind of data persistence do you need? (SQL, NoSQL, file-based, in-memory)',
            why: 'Data layer is foundational — changing it later is very expensive',
        });
    }

    if (descLower.includes('api') || descLower.includes('server') || descLower.includes('backend')) {
        questions.push({
            category: '🔧 Technical',
            question: 'Does this need authentication? If so, what type? (API key, OAuth, JWT, session-based)',
            why: 'Auth is a cross-cutting concern that affects every endpoint',
        });
    }

    // ─── Priority & Timeline Questions ───────────────────────────
    questions.push({
        category: '⏰ Priority',
        question: 'What is the timeline? (Quick prototype, MVP in a week, production-ready)',
        why: 'Timeline determines whether to optimize for speed or quality',
    });

    questions.push({
        category: '⏰ Priority',
        question: 'Which matters more right now: getting it working fast (MVP) or getting it right (production-quality)?',
        why: 'This shapes how many phases we create and how thorough each one is',
    });

    // ─── Integration Questions ───────────────────────────────────
    if (descLower.includes('integrat') || descLower.includes('connect') || descLower.includes('api') || descLower.includes('third-party')) {
        questions.push({
            category: '🔗 Integration',
            question: 'What external services or APIs does this need to connect to?',
            why: 'External dependencies add complexity and potential failure points',
        });
    }

    // ─── Existing Code Questions ─────────────────────────────────
    if (descLower.includes('refactor') || descLower.includes('improve') || descLower.includes('fix') || descLower.includes('update') ||
        descLower.includes('add') || descLower.includes('modify') || descLower.includes('change')) {
        questions.push({
            category: '📦 Existing Code',
            question: 'Is this a new project from scratch or are you modifying an existing codebase?',
            why: 'Brownfield projects need architecture mapping before planning',
        });
    }

    return questions;
}

function generateReadySummary(
    description: string,
    projectType: string | undefined,
    answers: Array<{ question: string; answer: string }>
): string {
    const answerMap = new Map(answers.map(a => [a.question, a.answer]));

    let summary = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► INTENT CLARIFIED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project Description:
  ${description}

${projectType ? `🏗️ Project Type: ${projectType}\n` : ''}
📝 Clarification Summary:
${answers.map(a => `  Q: ${a.question}\n  A: ${a.answer}`).join('\n\n')}

───────────────────────────────────────
▶ NEXT STEPS:
  1. Use phases_init with the clarified information above
  2. Use the answers to fill in: vision, goals, non_goals, users, constraints, success_criteria
  3. Break the work into 3-5 small phases (use phases_refine if they feel too large)
───────────────────────────────────────`;

    return summary;
}

export function handleClarify(
    fileManager: FileManager,
    stateManager: StateManager,
    input: ClarifyInput
): { success: boolean; message: string; stage: 'questions' | 'ready' } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    // If answers are provided, generate the "ready" summary
    if (input.answers && input.answers.length > 0) {
        // Save clarification to .gsd if initialized, or just return the summary
        const summary = generateReadySummary(input.description, input.project_type, input.answers);

        // If project is already initialized, save clarification to journal
        if (fileManager.isGsdInitialized()) {
            const journal = fileManager.readGsdFile('JOURNAL.md') || '';
            const clarifyEntry = `
### Intent Clarification — ${new Date().toISOString().split('T')[0]}
${input.answers.map(a => `- **${a.question}**: ${a.answer}`).join('\n')}
`;
            fileManager.writeGsdFile('JOURNAL.md', journal + clarifyEntry);
        }

        return {
            success: true,
            message: summary,
            stage: 'ready',
        };
    }

    // Generate questions based on the description
    const questions = generateQuestions(input.description, input.project_type);

    // Group questions by category
    const grouped = new Map<string, ClarifyQuestion[]>();
    for (const q of questions) {
        if (!grouped.has(q.category)) grouped.set(q.category, []);
        grouped.get(q.category)!.push(q);
    }

    let questionDisplay = '';
    let questionNum = 1;
    for (const [category, qs] of grouped) {
        questionDisplay += `\n${category}\n`;
        for (const q of qs) {
            questionDisplay += `  ${questionNum}. ${q.question}\n     💡 Why: ${q.why}\n`;
            questionNum++;
        }
    }

    return {
        success: true,
        stage: 'questions',
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► CLARIFYING INTENT 🔍
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 You described: "${input.description}"
${input.project_type ? `🏗️ Project type: ${input.project_type}` : ''}

Before we start building, let's make sure we understand
what you really need. Please answer these questions:
${questionDisplay}
───────────────────────────────────────
▶ NEXT: Call phases_clarify again with the same
  description and your answers in the "answers" parameter.

  Example:
  {
    "description": "${input.description}",
    "answers": [
      { "question": "What is the single most important...", "answer": "..." },
      { "question": "What should this project NOT do?", "answer": "..." }
    ]
  }
───────────────────────────────────────`,
    };
}
