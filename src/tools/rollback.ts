import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { GitManager } from '../managers/git-manager.js';
import fs from 'fs';
import path from 'path';

export interface RollbackInput {
    phase: number;
    working_directory?: string;
}

export function handleRollback(
    fileManager: FileManager,
    stateManager: StateManager,
    gitManager: GitManager,
    input: RollbackInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized() || !gitManager.isGitRepo()) {
        return { success: false, message: '❌ GSD project or Git repository not initialized.' };
    }

    // Attempt to find the snapshot commit before this phase began planning/execution.
    const targetCommit = gitManager.getCommitBeforePhase(input.phase);

    if (!targetCommit) {
        return {
            success: false,
            message: `❌ Cannot find a valid commit to rollback Phase ${input.phase}. 
Ensure the previous phase was fully completed or this is a properly initialized repository.`
        };
    }

    // 1. Perform a hard reset
    const result = gitManager.rollbackToCommit(targetCommit);

    // 2. Clear out any uncommitted/untracked debris in the phase folder
    try {
        const phaseDir = path.join(fileManager.getWorkingDir(), '.gsd', 'phases', input.phase.toString());
        if (fs.existsSync(phaseDir)) {
            fs.rmSync(phaseDir, { recursive: true, force: true });
        }
    } catch (e) {
        // non-fatal
    }

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► ROLLBACK COMPLETE ⏪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase ${input.phase} has been rolled back.
Git repository reset to commit: ${targetCommit.substring(0, 7)}
Output: ${result}

Any plans, summaries, and code changes made during this phase have been wiped.
Your project state and roadmap are restored to the exact moment before Phase ${input.phase} started.

───────────────────────────────────────
▶ NEXT: You can use phases_plan again with phase ${input.phase}
───────────────────────────────────────`,
    };
}
