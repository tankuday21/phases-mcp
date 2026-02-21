import { execSync } from 'child_process';
import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { generateVerification, generateTestResults } from '../templates/index.js';

// ─── phases_verify (upgraded with auto-test execution) ──────────

export interface TestSpec {
    description: string;
    command: string;
}

export interface VerifyInput {
    phase: number;
    tests: Array<TestSpec>;
    working_directory?: string;
}

interface TestResult {
    description: string;
    command: string;
    passed: boolean;
    output: string;
    duration: number;
    error?: string;
}

function runTest(test: TestSpec, cwd: string): TestResult {
    const start = Date.now();
    try {
        const output = execSync(test.command, {
            cwd,
            encoding: 'utf-8',
            timeout: 30000, // 30 second timeout per test
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        const duration = Date.now() - start;

        return {
            description: test.description,
            command: test.command,
            passed: true,
            output: output.trim().substring(0, 2000), // Cap output at 2000 chars
            duration,
        };
    } catch (error: any) {
        const duration = Date.now() - start;
        const stdout = error.stdout?.trim() || '';
        const stderr = error.stderr?.trim() || '';
        const output = [stdout, stderr].filter(Boolean).join('\n').substring(0, 2000);

        return {
            description: test.description,
            command: test.command,
            passed: false,
            output,
            duration,
            error: error.message?.substring(0, 500) || 'Command failed',
        };
    }
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

    const cwd = fileManager.getWorkingDir();

    // Run all tests
    const results: TestResult[] = [];
    for (const test of input.tests) {
        const result = runTest(test, cwd);
        results.push(result);
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const verdict = failed === 0 ? 'PASS' : 'FAIL';

    // Write VERIFICATION.md
    const verificationContent = generateVerification({
        phase: input.phase,
        mustHaves: results.map(r => ({
            description: r.description,
            passed: r.passed,
            evidence: r.passed
                ? `Command succeeded (${r.duration}ms)`
                : `Command failed: ${r.error || 'Non-zero exit code'}`,
        })),
        verdict,
    });

    fileManager.writeFile(
        `.gsd/phases/${input.phase}/VERIFICATION.md`,
        verificationContent
    );

    // Write TEST-RESULTS.md with full output
    const testResultsContent = generateTestResults({
        phase: input.phase,
        results,
        totalDuration,
        verdict,
    });

    fileManager.writeFile(
        `.gsd/phases/${input.phase}/TEST-RESULTS.md`,
        testResultsContent
    );

    // Update state
    stateManager.updateState({
        phase: input.phase,
        task: 'Verification complete',
        status: `Phase ${input.phase} verification: ${verdict}`,
    });

    // Build results display
    const resultsDisplay = results
        .map(r => {
            const icon = r.passed ? '✅' : '❌';
            const time = `${r.duration}ms`;
            return `  ${icon} ${r.description} (${time})\n     $ ${r.command}${!r.passed ? `\n     ⛔ ${r.error || 'Failed'}` : ''}`;
        })
        .join('\n\n');

    if (verdict === 'PASS') {
        return {
            success: true,
            verdict: 'PASS',
            message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► PHASE ${input.phase} VERIFIED ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${passed}/${total} tests passed (${totalDuration}ms total)

${resultsDisplay}

📄 Full results: .gsd/phases/${input.phase}/TEST-RESULTS.md

───────────────────────────────────────
▶ NEXT: Proceed to next phase or phases_milestone
───────────────────────────────────────`,
        };
    }

    return {
        success: true,
        verdict: 'FAIL',
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► PHASE ${input.phase} TESTS FAILED ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${passed}/${total} tests passed, ${failed} FAILED (${totalDuration}ms total)

${resultsDisplay}

📄 Full results: .gsd/phases/${input.phase}/TEST-RESULTS.md

───────────────────────────────────────
▶ NEXT: Fix failures and re-verify, or use phases_rollback
───────────────────────────────────────`,
    };
}
