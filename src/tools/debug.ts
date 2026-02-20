import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';

export interface DebugInput {
    phase: number;
    description: string;
    hypothesis?: string;
    result?: string;
    working_directory?: string;
}

export function handleDebug(
    fileManager: FileManager,
    stateManager: StateManager,
    input: DebugInput
): { success: boolean; message: string; strikes: number; exhausted: boolean } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    // Increment debug strike
    const strikes = stateManager.incrementDebugStrike();
    const exhausted = strikes >= 3;

    // Log the debug attempt
    const journal = fileManager.readGsdFile('JOURNAL.md') || '';
    const debugEntry = `
### Debug Attempt (Strike ${strikes}/3)
**Date**: ${new Date().toISOString()}
**Phase**: ${input.phase}
**Issue**: ${input.description}
${input.hypothesis ? `**Hypothesis**: ${input.hypothesis}` : ''}
${input.result ? `**Result**: ${input.result}` : '**Result**: Pending'}
`;
    fileManager.writeGsdFile('JOURNAL.md', journal + debugEntry);

    if (exhausted) {
        // Save state for fresh session
        stateManager.updateState({
            phase: input.phase,
            task: `Debug exhausted: ${input.description}`,
            status: '🔴 CONTEXT DUMP REQUIRED — 3 strikes reached',
            blockers: [`Debug exhausted after 3 attempts: ${input.description}`],
        });

        return {
            success: true,
            strikes,
            exhausted: true,
            message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► DEBUG EXHAUSTED ⛔ (3/3 strikes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issue: ${input.description}

3 debugging attempts exhausted.
State has been saved to STATE.md.

🔴 ACTION REQUIRED:
1. Use gsd_pause to save current session
2. Start a fresh session
3. Use gsd_resume to restore context

The fresh context will help avoid circular debugging.

───────────────────────────────────────`,
        };
    }

    return {
        success: true,
        strikes,
        exhausted: false,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► DEBUG ATTEMPT ${strikes}/3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issue: ${input.description}
${input.hypothesis ? `Hypothesis: ${input.hypothesis}` : ''}
${input.result ? `Result: ${input.result}` : ''}

Strikes: ${'🟡'.repeat(strikes)}${'⚪'.repeat(3 - strikes)} (${strikes}/3)
${strikes === 2 ? '\n⚠️ WARNING: Next attempt is your last before context dump!' : ''}

───────────────────────────────────────
Remaining attempts: ${3 - strikes}
───────────────────────────────────────`,
    };
}
