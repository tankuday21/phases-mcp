import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { generateVerification } from '../templates/index.js';

export interface VerifyInput {
    phase: number;
    must_haves: Array<{
        description: string;
        passed: boolean;
        evidence: string;
    }>;
    working_directory?: string;
}

export function handleVerify(
    fileManager: FileManager,
    stateManager: StateManager,
    input: VerifyInput
): { success: boolean; message: string; verdict: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No GSD project found.', verdict: 'ERROR' };
    }

    const passed = input.must_haves.filter(m => m.passed).length;
    const total = input.must_haves.length;
    const verdict = passed === total ? 'PASS' : 'FAIL';

    // Write verification file
    const verificationContent = generateVerification({
        phase: input.phase,
        mustHaves: input.must_haves,
        verdict,
    });

    fileManager.writeFile(
        `.gsd/phases/${input.phase}/VERIFICATION.md`,
        verificationContent
    );

    // Update state
    stateManager.updateState({
        phase: input.phase,
        task: 'Verification complete',
        status: `Phase ${input.phase} verification: ${verdict}`,
    });

    if (verdict === 'PASS') {
        return {
            success: true,
            verdict: 'PASS',
            message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► PHASE ${input.phase} VERIFIED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${passed}/${total} must-haves passed ✅

${input.must_haves.map(m => `  ✅ ${m.description}`).join('\n')}

───────────────────────────────────────
▶ NEXT: Proceed to next phase or phases_milestone
───────────────────────────────────────`,
        };
    }

    const failures = input.must_haves.filter(m => !m.passed);
    return {
        success: true,
        verdict: 'FAIL',
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► PHASE ${input.phase} GAPS FOUND ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${passed}/${total} must-haves verified

${input.must_haves.map(m => `  ${m.passed ? '✅' : '❌'} ${m.description}${!m.passed ? ` — ${m.evidence}` : ''}`).join('\n')}

Failures:
${failures.map(f => `  ❌ ${f.description}: ${f.evidence}`).join('\n')}

───────────────────────────────────────
▶ NEXT: Fix gaps and re-execute, then re-verify
───────────────────────────────────────`,
    };
}
