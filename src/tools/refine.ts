import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';

// ─── phases_refine ──────────────────────────────────────────────

export interface RefineInput {
    phase: number;
    sub_phases: Array<{ name: string; objective: string }>;
    reason?: string;
    working_directory?: string;
}

export function handleRefine(
    fileManager: FileManager,
    stateManager: StateManager,
    input: RefineInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No Phases project found. Run phases_init first.' };
    }

    const phases = fileManager.parseRoadmapPhases();
    const target = phases.find(p => p.number === input.phase);

    if (!target) {
        return {
            success: false,
            message: `❌ Phase ${input.phase} not found. Available: ${phases.map(p => `${p.number} (${p.name})`).join(', ')}`,
        };
    }

    // Can't refine a completed phase
    if (target.status.includes('✅') || target.status.includes('Complete')) {
        return {
            success: false,
            message: `❌ Cannot refine completed Phase ${input.phase} ("${target.name}").`,
        };
    }

    // Can't refine a phase that's already been planned
    const planFiles = fileManager.getPlanFiles(input.phase);
    if (planFiles.length > 0) {
        return {
            success: false,
            message: `❌ Phase ${input.phase} already has ${planFiles.length} plan(s). Rollback the phase first before refining.`,
        };
    }

    if (input.sub_phases.length < 2) {
        return {
            success: false,
            message: '❌ Refinement requires at least 2 sub-phases. If the phase is already small enough, skip refinement.',
        };
    }

    // Read current roadmap
    const roadmap = fileManager.readGsdFile('ROADMAP.md') || '';

    // Remove the original phase entry
    const phaseRegex = new RegExp(
        `### Phase ${input.phase}:[\\s\\S]*?(?=### Phase \\d|---\\n|$)`,
        'g'
    );

    let updated = roadmap.replace(phaseRegex, '');

    // Renumber all phases after the one being refined
    // First, collect all phases that come after
    const phasesAfter = phases.filter(p => p.number > input.phase);

    // Remove those phases too (we'll re-add them with new numbers)
    for (const p of phasesAfter) {
        const afterRegex = new RegExp(
            `### Phase ${p.number}:[\\s\\S]*?(?=### Phase \\d|---\\n|$)`,
            'g'
        );
        updated = afterRegex.test(updated) ? updated.replace(afterRegex, '') : updated;
    }

    // Build the new sub-phases starting at the original phase number
    const newPhaseEntries: string[] = [];
    for (let i = 0; i < input.sub_phases.length; i++) {
        const newNum = input.phase + i;
        newPhaseEntries.push(`### Phase ${newNum}: ${input.sub_phases[i].name}
**Status**: ⬜ Not Started
**Objective**: ${input.sub_phases[i].objective}
`);
        fileManager.ensurePhaseDir(newNum);
    }

    // Re-add the phases that came after, with renumbered phase numbers
    const offset = input.sub_phases.length - 1; // how many extra phases we added
    for (const p of phasesAfter) {
        const newNum = p.number + offset;
        newPhaseEntries.push(`### Phase ${newNum}: ${p.name}
**Status**: ${p.status}
**Objective**: ${p.status}
`);
        fileManager.ensurePhaseDir(newNum);
    }

    // Append all new phase entries
    updated = updated.trimEnd() + '\n\n' + newPhaseEntries.join('\n') + '\n';

    fileManager.writeGsdFile('ROADMAP.md', updated);

    // Record in decisions
    const decisions = fileManager.readGsdFile('DECISIONS.md') || '';
    const decisionEntry = `### ADR-${Date.now()}
**Date**: ${new Date().toISOString().split('T')[0]}
**Phase**: ${input.phase}
**Decision**: Refined Phase ${input.phase} ("${target.name}") into ${input.sub_phases.length} sub-phases
${input.reason ? `**Reason**: ${input.reason}` : ''}
**Sub-phases**:
${input.sub_phases.map((sp, i) => `  ${input.phase + i}. ${sp.name} — ${sp.objective}`).join('\n')}
`;
    fileManager.writeGsdFile('DECISIONS.md', decisions + '\n' + decisionEntry);

    // Update state
    stateManager.updateState({
        phase: input.phase,
        task: `Phase ${input.phase} refined`,
        status: `Phase ${input.phase} split into ${input.sub_phases.length} sub-phases`,
    });

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► PHASE ${input.phase} REFINED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Original: Phase ${input.phase} — "${target.name}"
Split into ${input.sub_phases.length} focused sub-phases:

${input.sub_phases.map((sp, i) => `  📦 Phase ${input.phase + i}: ${sp.name}\n     ${sp.objective}`).join('\n\n')}

${input.reason ? `\nReason: ${input.reason}` : ''}
${phasesAfter.length > 0 ? `\n⚠️ ${phasesAfter.length} subsequent phase(s) renumbered (offset +${offset})` : ''}

───────────────────────────────────────
▶ NEXT: Use phases_plan with phase ${input.phase}
───────────────────────────────────────`,
    };
}
