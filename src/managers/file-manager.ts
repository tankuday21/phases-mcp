import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

export class FileManager {
    private workingDir: string;

    constructor(workingDir?: string) {
        this.workingDir = workingDir || process.cwd();
    }

    get gsdDir(): string {
        return join(this.workingDir, '.gsd');
    }

    get phasesDir(): string {
        return join(this.gsdDir, 'phases');
    }

    setWorkingDir(dir: string): void {
        this.workingDir = resolve(dir);
    }

    getWorkingDir(): string {
        return this.workingDir;
    }

    // ─── File Operations ─────────────────────────────────────────

    readFile(relativePath: string): string | null {
        const fullPath = join(this.workingDir, relativePath);
        try {
            return readFileSync(fullPath, 'utf-8');
        } catch {
            return null;
        }
    }

    writeFile(relativePath: string, content: string): void {
        const fullPath = join(this.workingDir, relativePath);
        const dir = fullPath.substring(0, fullPath.lastIndexOf('\\') > -1 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, content, 'utf-8');
    }

    fileExists(relativePath: string): boolean {
        return existsSync(join(this.workingDir, relativePath));
    }

    ensureDir(relativePath: string): void {
        const fullPath = join(this.workingDir, relativePath);
        if (!existsSync(fullPath)) {
            mkdirSync(fullPath, { recursive: true });
        }
    }

    listFiles(relativePath: string, pattern?: string): string[] {
        const fullPath = join(this.workingDir, relativePath);
        if (!existsSync(fullPath)) return [];
        try {
            const files = readdirSync(fullPath);
            if (pattern) {
                const regex = new RegExp(pattern);
                return files.filter(f => regex.test(f));
            }
            return files;
        } catch {
            return [];
        }
    }

    // ─── GSD-Specific Operations ─────────────────────────────────

    isGsdInitialized(): boolean {
        return this.fileExists('.gsd/SPEC.md');
    }

    isSpecFinalized(): boolean {
        const spec = this.readFile('.gsd/SPEC.md');
        return spec !== null && spec.includes('FINALIZED');
    }

    readGsdFile(name: string): string | null {
        return this.readFile(`.gsd/${name}`);
    }

    writeGsdFile(name: string, content: string): void {
        this.writeFile(`.gsd/${name}`, content);
    }

    getPhaseDir(phase: number): string {
        return `.gsd/phases/${phase}`;
    }

    ensurePhaseDir(phase: number): void {
        this.ensureDir(`.gsd/phases/${phase}`);
    }

    getPlanFiles(phase: number): string[] {
        const phaseDir = this.getPhaseDir(phase);
        return this.listFiles(phaseDir, '.*-PLAN\\.md$');
    }

    getSummaryFiles(phase: number): string[] {
        const phaseDir = this.getPhaseDir(phase);
        return this.listFiles(phaseDir, '.*-SUMMARY\\.md$');
    }

    // ─── Brownfield Detection ────────────────────────────────────

    detectExistingCode(): { hasCode: boolean; fileCount: number; languages: string[] } {
        const extensions = ['.ts', '.js', '.py', '.go', '.rs', '.java', '.cpp', '.c', '.rb', '.php'];
        const languages: Set<string> = new Set();
        let fileCount = 0;

        const scan = (dir: string, depth: number = 0): void => {
            if (depth > 4) return;
            try {
                const entries = readdirSync(dir);
                for (const entry of entries) {
                    if (entry === 'node_modules' || entry === '.git' || entry === '.gsd' || entry === 'dist') continue;
                    const fullPath = join(dir, entry);
                    try {
                        const stat = statSync(fullPath);
                        if (stat.isDirectory()) {
                            scan(fullPath, depth + 1);
                        } else {
                            const ext = entry.substring(entry.lastIndexOf('.'));
                            if (extensions.includes(ext)) {
                                fileCount++;
                                languages.add(ext);
                            }
                        }
                    } catch { /* skip inaccessible */ }
                }
            } catch { /* skip */ }
        };

        scan(this.workingDir);
        return { hasCode: fileCount > 0, fileCount, languages: Array.from(languages) };
    }

    // ─── Phase Parsing ───────────────────────────────────────────

    parseRoadmapPhases(): Array<{ number: number; name: string; status: string }> {
        const roadmap = this.readGsdFile('ROADMAP.md');
        if (!roadmap) return [];

        const phases: Array<{ number: number; name: string; status: string }> = [];
        const regex = /### Phase (\d+):\s*(.+)\n\*\*Status\*\*:\s*(.+)/g;
        let match;

        while ((match = regex.exec(roadmap)) !== null) {
            phases.push({
                number: parseInt(match[1]),
                name: match[2].trim(),
                status: match[3].trim(),
            });
        }

        return phases;
    }

    getNextUnplannedPhase(): number | null {
        const phases = this.parseRoadmapPhases();
        const planned = phases.find(p => p.status.includes('Not Started'));
        return planned ? planned.number : null;
    }
}
