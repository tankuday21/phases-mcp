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

    commitTask(phase: number, taskName: string): string {
        this.exec('git add -A');
        const message = `feat(phase-${phase}): ${taskName}`;
        return this.exec(`git commit -m "${message}"`);
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
}
