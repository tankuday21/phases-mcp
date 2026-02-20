import { execSync } from 'child_process';
import { FileManager } from './file-manager.js';

export class GitManager {
    private fileManager: FileManager;

    constructor(fileManager: FileManager) {
        this.fileManager = fileManager;
    }

    private exec(command: string): string {
        try {
            return execSync(command, {
                cwd: this.fileManager.getWorkingDir(),
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
            }).trim();
        } catch (error: any) {
            return error.message || 'Git command failed';
        }
    }

    // ─── Repository Management ───────────────────────────────────

    isGitRepo(): boolean {
        return this.fileManager.fileExists('.git');
    }

    initRepo(): string {
        if (this.isGitRepo()) {
            return 'Git repository already exists.';
        }
        return this.exec('git init');
    }

    // ─── Commits ─────────────────────────────────────────────────

    commitTask(phase: number, taskName: string): { message: string; diff: string } {
        this.exec('git add -A');
        const diff = this.exec('git diff --staged');
        const message = `feat(phase-${phase}): ${taskName}`;
        const commitResult = this.exec(`git commit -m "${message}"`);
        return { message: commitResult, diff };
    }

    commitPhaseComplete(phase: number, phaseName: string): string {
        this.exec('git add -A');
        const message = `docs(phase-${phase}): complete ${phaseName}`;
        return this.exec(`git commit -m "${message}"`);
    }

    commitInit(): string {
        this.exec('git add .gsd/');
        const message = 'chore: initialize GSD project';
        return this.exec(`git commit -m "${message}"`);
    }

    commitPlans(phase: number): string {
        this.exec(`git add .gsd/phases/${phase}/`);
        this.exec('git add .gsd/STATE.md');
        const message = `docs(phase-${phase}): create execution plans`;
        return this.exec(`git commit -m "${message}"`);
    }

    commitGeneral(message: string): string {
        this.exec('git add -A');
        return this.exec(`git commit -m "${message}"`);
    }

    // ─── Status ──────────────────────────────────────────────────

    getStatus(): string {
        return this.exec('git status --short');
    }

    getLog(count: number = 5): string {
        return this.exec(`git log --oneline -n ${count}`);
    }

    // ─── Rollback ────────────────────────────────────────────────

    getCommitBeforePhase(phase: number): string | null {
        const grepStr = phase === 1
            ? '^chore: initialize GSD project'
            : `^docs(phase-${phase - 1}): complete`;

        // Use basic grep inside git log
        const commitHash = this.exec(`git log --grep="${grepStr}" --format="%H" -n 1`);
        return commitHash ? commitHash.trim() : null;
    }

    rollbackToCommit(commitHash: string): string {
        return this.exec(`git reset --hard ${commitHash}`);
    }
}
