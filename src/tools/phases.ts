import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';

// ─── gsd_add_phase ─────────────────────────────────────────────

export interface AddPhaseInput {
    name: string;
    objective: string;
    working_directory?: string;
}

export function handleAddPhase(
    fileManager: FileManager,
    stateManager: StateManager,
    input: AddPhaseInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No Phases project found.' };
    }

    const phases = fileManager.parseRoadmapPhases();
    const newPhaseNum = phases.length > 0 ? Math.max(...phases.map(p => p.number)) + 1 : 1;

    // Append to ROADMAP.md
    const roadmap = fileManager.readGsdFile('ROADMAP.md') || '';
    const newPhaseEntry = `

### Phase ${newPhaseNum}: ${input.name}
**Status**: ⬜ Not Started
**Objective**: ${input.objective}
`;

    fileManager.writeGsdFile('ROADMAP.md', roadmap + newPhaseEntry);
    fileManager.ensurePhaseDir(newPhaseNum);

    return {
        success: true,
        message: `✅ Phase ${newPhaseNum}: "${input.name}" added to ROADMAP.md\nObjective: ${input.objective}`,
    };
}

// ─── gsd_remove_phase ──────────────────────────────────────────

export interface RemovePhaseInput {
    phase: number;
    working_directory?: string;
}

export function handleRemovePhase(
    fileManager: FileManager,
    stateManager: StateManager,
    input: RemovePhaseInput
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

    if (target.status.includes('✅') || target.status.includes('Complete')) {
        return {
            success: false,
            message: `❌ Cannot remove completed Phase ${input.phase} ("${target.name}"). Safety check failed.`,
        };
    }

    // Remove from ROADMAP.md
    const roadmap = fileManager.readGsdFile('ROADMAP.md') || '';
    const regex = new RegExp(
        `### Phase ${input.phase}:[\\s\\S]*?(?=### Phase \\d|$)`,
        'g'
    );
    const updated = roadmap.replace(regex, '');
    fileManager.writeGsdFile('ROADMAP.md', updated);

    return {
        success: true,
        message: `✅ Phase ${input.phase}: "${target.name}" removed from ROADMAP.md`,
    };
}

// ─── gsd_discuss_phase ─────────────────────────────────────────

export interface DiscussPhaseInput {
    phase: number;
    questions?: string[];
    decisions?: string[];
    working_directory?: string;
}

export function handleDiscussPhase(
    fileManager: FileManager,
    stateManager: StateManager,
    input: DiscussPhaseInput
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
        return { success: false, message: `❌ Phase ${input.phase} not found.` };
    }

    // Load context
    const spec = fileManager.readGsdFile('SPEC.md') || '';
    const roadmap = fileManager.readGsdFile('ROADMAP.md') || '';

    // Record decisions if any
    if (input.decisions && input.decisions.length > 0) {
        const decisions = fileManager.readGsdFile('DECISIONS.md') || '';
        const newDecisions = input.decisions
            .map(
                (d, i) => `### ADR-${Date.now()}-${i + 1}
**Date**: ${new Date().toISOString().split('T')[0]}
**Phase**: ${input.phase}
**Decision**: ${d}
`
            )
            .join('\n');

        fileManager.writeGsdFile('DECISIONS.md', decisions + '\n' + newDecisions);
    }

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► DISCUSSING PHASE ${input.phase}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase ${input.phase}: ${target.name}
Objective: ${target.status}

${input.questions ? `\nOpen Questions:\n${input.questions.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}` : ''}
${input.decisions ? `\nDecisions Recorded:\n${input.decisions.map(d => `  ✅ ${d}`).join('\n')}` : ''}

Context Available:
  • SPEC.md (${spec.length} chars)
  • ROADMAP.md (${roadmap.length} chars)

───────────────────────────────────────
▶ When ready: Use phases_plan with phase ${input.phase}
───────────────────────────────────────`,
    };
}

// ─── gsd_milestone ─────────────────────────────────────────────

export interface MilestoneInput {
    name: string;
    phases: Array<{ name: string; objective: string }>;
    working_directory?: string;
}

export function handleMilestone(
    fileManager: FileManager,
    stateManager: StateManager,
    input: MilestoneInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No GSD project found.' };
    }

    // Update ROADMAP.md with new milestone
    const roadmap = fileManager.readGsdFile('ROADMAP.md') || '';

    const newPhasesStr = input.phases
        .map(
            (p, i) => `### Phase ${i + 1}: ${p.name}
**Status**: ⬜ Not Started
**Objective**: ${p.objective}`
        )
        .join('\n\n');

    const milestoneEntry = `

---

## Milestone: ${input.name}

${newPhasesStr}
`;

    fileManager.writeGsdFile('ROADMAP.md', roadmap + milestoneEntry);

    // Create phase directories
    input.phases.forEach((_, i) => {
        fileManager.ensurePhaseDir(i + 1);
    });

    return {
        success: true,
        message: `✅ Milestone "${input.name}" created with ${input.phases.length} phases\n\nPhases:\n${input.phases.map((p, i) => `  ${i + 1}. ${p.name}`).join('\n')}`,
    };
}
