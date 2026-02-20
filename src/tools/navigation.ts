import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';

// ─── gsd_progress ──────────────────────────────────────────────

export interface ProgressInput {
    working_directory?: string;
}

export function handleProgress(
    fileManager: FileManager,
    stateManager: StateManager,
    input: ProgressInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No GSD project found. Run gsd_init first.' };
    }

    const state = stateManager.getCurrentState();
    const phases = fileManager.parseRoadmapPhases();
    const spec = fileManager.readGsdFile('SPEC.md') || '';

    // Extract project name from SPEC
    const nameMatch = spec.match(/# SPEC\.md — (.+)/);
    const projectName = nameMatch ? nameMatch[1] : 'Unknown Project';

    const completed = phases.filter(p => p.status.includes('✅')).length;
    const inProgress = phases.filter(p => p.status.includes('🔄')).length;
    const notStarted = phases.filter(p => p.status.includes('Not Started') || p.status.includes('⬜')).length;
    const total = phases.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const phaseIcons: Record<string, string> = {
        '✅': '✅',
        '🔄': '🔄',
        '⬜': '⬜',
    };

    const phaseDisplay = phases
        .map(p => {
            let icon = '⬜';
            if (p.status.includes('✅') || p.status.includes('Complete')) icon = '✅';
            else if (p.status.includes('🔄') || p.status.includes('In Progress')) icon = '🔄';
            const current = p.number === state.phase ? ' ← CURRENT' : '';
            return `  ${icon} Phase ${p.number}: ${p.name}${current}`;
        })
        .join('\n');

    // Determine recommended action
    let nextAction = '';
    if (!fileManager.isSpecFinalized()) {
        nextAction = 'Complete gsd_init first';
    } else if (state.phase === null || notStarted === total) {
        nextAction = 'Use gsd_plan with phase 1 to begin';
    } else if (state.status.includes('Ready for execution')) {
        nextAction = `Use gsd_execute with phase ${state.phase}`;
    } else if (state.status.includes('fully executed')) {
        nextAction = `Use gsd_verify with phase ${state.phase}`;
    } else if (state.status.includes('verification: FAIL')) {
        nextAction = `Fix gaps and re-execute phase ${state.phase}`;
    } else if (completed === total) {
        nextAction = '🎉 All phases complete! Celebrate!';
    } else {
        nextAction = state.task ? `Continue: ${state.task}` : 'Check STATE.md for details';
    }

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${projectName}

PHASES
${phaseDisplay}

Progress: ${completed}/${total} (${percentage}%)

CURRENT TASK
  ${state.task ?? 'None'}

STATUS
  ${state.status}

BLOCKERS
  ${state.blockers.length > 0 ? state.blockers.join('\n  ') : 'None'}

───────────────────────────────────────
▶ NEXT: ${nextAction}
───────────────────────────────────────`,
    };
}

// ─── gsd_pause ─────────────────────────────────────────────────

export interface PauseInput {
    summary: string;
    working_directory?: string;
}

export function handlePause(
    fileManager: FileManager,
    stateManager: StateManager,
    input: PauseInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No GSD project found.' };
    }

    const sessionData = stateManager.saveSession(input.summary);

    // Append to journal
    const journal = fileManager.readGsdFile('JOURNAL.md') || '';
    const pauseEntry = `
### Session Paused — ${new Date().toISOString().split('T')[0]}
${input.summary}
`;
    fileManager.writeGsdFile('JOURNAL.md', journal + pauseEntry);

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SESSION PAUSED ⏸️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary: ${input.summary}
State saved to .gsd/STATE.md

───────────────────────────────────────
▶ Use gsd_resume in your next session
───────────────────────────────────────`,
    };
}

// ─── gsd_resume ────────────────────────────────────────────────

export interface ResumeInput {
    working_directory?: string;
}

export function handleResume(
    fileManager: FileManager,
    stateManager: StateManager,
    input: ResumeInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No GSD project found.' };
    }

    const result = stateManager.restoreSession();
    const state = result.state;

    // Load key context
    const spec = fileManager.readGsdFile('SPEC.md') || '';
    const roadmap = fileManager.readGsdFile('ROADMAP.md') || '';

    return {
        success: result.success,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SESSION RESUMED ▶️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase: ${state.phase ?? 'None'}
Task: ${state.task ?? 'None'}
Status: ${state.status}

Context loaded:
  • SPEC.md (${spec.length} chars)
  • ROADMAP.md (${roadmap.length} chars)
  • STATE.md

${state.blockers.length > 0 ? `⚠️ Blockers:\n${state.blockers.map(b => `  - ${b}`).join('\n')}` : ''}

───────────────────────────────────────
▶ ${result.message}
───────────────────────────────────────`,
    };
}
