import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { GitManager } from '../managers/git-manager.js';

// ─── phases_rollback ────────────────────────────────────────────

export interface RollbackInput {
    phase: number;
    confirm?: boolean;
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

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No Phases project found.' };
    }

    const phases = fileManager.parseRoadmapPhases();
    const target = phases.find(p => p.number === input.phase);

    if (!target) {
        return {
            success: false,
            message: `❌ Phase ${input.phase} not found. Available: ${phases.map(p => p.number).join(', ')}`,
        };
    }

    // Safety: require explicit confirmation
    if (!input.confirm) {
        // Show what would be rolled back
        const planFiles = fileManager.getPlanFiles(input.phase);
        const summaryFiles = fileManager.getSummaryFiles(input.phase);

        return {
            success: false,
            message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► ROLLBACK PREVIEW ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase ${input.phase}: "${target.name}"
Status: ${target.status}

This will:
  🗑️ Delete ${planFiles.length} plan file(s)
  🗑️ Delete ${summaryFiles.length} summary file(s)
  🔄 Reset phase status to "Not Started"
  📝 Reset the phase using git

⚠️ WARNING: This action uses git reset and cannot be undone!

───────────────────────────────────────
▶ To confirm, call phases_rollback again with:
  { "phase": ${input.phase}, "confirm": true }
───────────────────────────────────────`,
        };
    }

    // Find the commit to rollback to
    const rollbackCommit = gitManager.findPhaseStartCommit(input.phase);

    if (rollbackCommit) {
        // Perform git hard reset
        gitManager.hardReset(rollbackCommit);
    }

    // Clean up phase files (in case git reset didn't catch everything)
    const phaseDir = fileManager.getPhaseDir(input.phase);
    const allFiles = fileManager.listFiles(phaseDir);
    let filesDeleted = 0;
    for (const file of allFiles) {
        try {
            fileManager.deleteFile(`${phaseDir}/${file}`);
            filesDeleted++;
        } catch {
            // File may already be deleted by git reset
        }
    }

    // Update ROADMAP.md — reset phase status
    const roadmap = fileManager.readGsdFile('ROADMAP.md');
    if (roadmap) {
        const updated = roadmap.replace(
            new RegExp(`(### Phase ${input.phase}:[\\s\\S]*?\\*\\*Status\\*\\*:)\\s*.+`),
            `$1 ⬜ Not Started`
        );
        fileManager.writeGsdFile('ROADMAP.md', updated);
    }

    // Update state
    stateManager.updateState({
        phase: input.phase,
        task: `Phase ${input.phase} rolled back`,
        status: `Phase ${input.phase} reset to Not Started`,
    });

    // Record in journal
    const journal = fileManager.readGsdFile('JOURNAL.md') || '';
    const rollbackEntry = `
### Phase ${input.phase} Rolled Back — ${new Date().toISOString().split('T')[0]}
- Phase "${target.name}" was rolled back to its pre-planning state
${rollbackCommit ? `- Git reset to: ${rollbackCommit}` : '- No git commits found for this phase'}
- ${filesDeleted} file(s) cleaned up
`;
    fileManager.writeGsdFile('JOURNAL.md', journal + rollbackEntry);

    // Commit the rollback state
    gitManager.commitGeneral(`rollback(phase-${input.phase}): reset ${target.name}`);

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► PHASE ${input.phase} ROLLED BACK ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase ${input.phase}: "${target.name}"
${rollbackCommit ? `Git reset to: ${rollbackCommit}` : 'No phase commits found — files cleaned up'}
Files removed: ${filesDeleted}
Status: ⬜ Not Started

───────────────────────────────────────
▶ NEXT: Re-plan Phase ${input.phase} with phases_plan
───────────────────────────────────────`,
    };
}
