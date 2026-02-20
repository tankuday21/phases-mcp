import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { GitManager } from '../managers/git-manager.js';
import { generatePlan } from '../templates/index.js';

export interface PlanInput {
    phase?: number;
    plans: Array<{
        name: string;
        wave?: number;
        objective: string;
        context_files?: string[];
        tasks: Array<{
            name: string;
            files: string[];
            action: string;
            verify: string;
            done: string;
            type?: string;
        }>;
        success_criteria: string[];
    }>;
    skip_research?: boolean;
    working_directory?: string;
}

export function handlePlan(
    fileManager: FileManager,
    stateManager: StateManager,
    gitManager: GitManager,
    input: PlanInput
): { success: boolean; message: string; plans_created: string[] } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    // Validate environment
    if (!fileManager.isGsdInitialized()) {
        return {
            success: false,
            message: '❌ No GSD project found. Run gsd_init first.',
            plans_created: [],
        };
    }

    if (!fileManager.isSpecFinalized()) {
        return {
            success: false,
            message: '❌ SPEC.md must be FINALIZED before planning. Complete gsd_init first.',
            plans_created: [],
        };
    }

    // Determine phase
    let phase = input.phase;
    if (!phase) {
        phase = fileManager.getNextUnplannedPhase() ?? 1;
    }

    // Validate phase exists in roadmap
    const phases = fileManager.parseRoadmapPhases();
    const targetPhase = phases.find(p => p.number === phase);
    if (!targetPhase) {
        return {
            success: false,
            message: `❌ Phase ${phase} not found in ROADMAP.md. Available phases: ${phases.map(p => `${p.number} (${p.name})`).join(', ')}`,
            plans_created: [],
        };
    }

    // Ensure phase directory
    fileManager.ensurePhaseDir(phase);

    // Create plan files
    const plansCreated: string[] = [];

    for (let i = 0; i < input.plans.length; i++) {
        const plan = input.plans[i];
        const planNumber = i + 1;
        const wave = plan.wave ?? 1;

        const planContent = generatePlan({
            phase,
            planNumber,
            wave,
            planName: plan.name,
            objective: plan.objective,
            contextFiles: plan.context_files || ['.gsd/SPEC.md', '.gsd/ARCHITECTURE.md'],
            tasks: plan.tasks,
            successCriteria: plan.success_criteria,
        });

        const fileName = `${planNumber}-PLAN.md`;
        const filePath = `.gsd/phases/${phase}/${fileName}`;
        fileManager.writeFile(filePath, planContent);
        plansCreated.push(filePath);
    }

    // Update state
    stateManager.updateState({
        phase,
        task: 'Planning complete',
        status: 'Ready for execution',
    });

    // Commit plans
    gitManager.commitPlans(phase);

    // Group by waves for display
    const waveGroups: Record<number, string[]> = {};
    input.plans.forEach((p, i) => {
        const w = p.wave ?? 1;
        if (!waveGroups[w]) waveGroups[w] = [];
        waveGroups[w].push(`${phase}.${i + 1}: ${p.name}`);
    });

    const waveDisplay = Object.entries(waveGroups)
        .map(([w, plans]) => `Wave ${w}: ${plans.join(', ')}`)
        .join('\n');

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE ${phase} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${input.plans.length} plans created

${waveDisplay}

Plans:
${plansCreated.map(p => `  • ${p}`).join('\n')}

───────────────────────────────────────
▶ NEXT: Use gsd_execute with phase ${phase}
───────────────────────────────────────`,
        plans_created: plansCreated,
    };
}
