import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { generateVerification } from '../templates/index.js';

import { execSync } from 'child_process';

export interface VerifyInput {
    phase: number;
    tests: Array<{
        description: string;
        command: string;
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
        return { success: false, message: '❌ No Phases project found.', verdict: 'ERROR' };
    }

    const stateValidation = stateManager.validateTransition([
        'Phase fully executed',
        'Phase verification:'
    ]);

    if (!stateValidation.valid) {
        return { success: false, message: stateValidation.message!, verdict: 'ERROR' };
    }

    const results = input.tests.map(t => {
        try {
            const output = execSync(t.command, { stdio: 'pipe', encoding: 'utf-8', cwd: fileManager.getWorkingDir() });
            return {
                description: t.description,
                passed: true,
                evidence: `Command: \`${t.command}\`\nOutput:\n\`\`\`\n${output.trim() || 'Exited with 0'}\n\`\`\``
            };
        } catch (error: any) {
            return {
                description: t.description,
                passed: false,
                evidence: `Command: \`${t.command}\`\nFailed:\n\`\`\`\n${error.stdout?.toString() || ''}\n${error.stderr?.toString() || error.message}\n\`\`\``
            };
        }
    });

    const passed = results.filter(m => m.passed).length;
    const total = results.length;
    const verdict = passed === total ? 'PASS' : 'FAIL';

    // Write verification file
    const verificationContent = generateVerification({
        phase: input.phase,
        mustHaves: results,
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

${results.map(m => `  ✅ ${m.description}`).join('\n')}

───────────────────────────────────────
▶ NEXT: Proceed to next phase or phases_milestone
───────────────────────────────────────`,
        };
    }

    const failures = results.filter(m => !m.passed);
    return {
        success: true,
        verdict: 'FAIL',
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► PHASE ${input.phase} GAPS FOUND ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${passed}/${total} tests passed

${results.map(m => `  ${m.passed ? '✅' : '❌'} ${m.description}`).join('\n')}

Failures:
${failures.map(f => `  ❌ ${f.description}:\n${f.evidence}`).join('\n\n')}

───────────────────────────────────────
▶ NEXT: Fix gaps, document them, and re-verify
───────────────────────────────────────`,
    };
}
