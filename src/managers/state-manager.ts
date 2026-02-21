import { FileManager } from './file-manager.js';

export interface SessionState {
    phase: number | null;
    task: string | null;
    status: string;
    lastUpdated: string;
    blockers: string[];
    debugStrikes: number;
}

export class StateManager {
    private fileManager: FileManager;

    constructor(fileManager: FileManager) {
        this.fileManager = fileManager;
    }

    // ─── State Reading ───────────────────────────────────────────

    getCurrentState(): SessionState {
        const stateContent = this.fileManager.readGsdFile('STATE.md');
        if (!stateContent) {
            return {
                phase: null,
                task: null,
                status: 'Not initialized',
                lastUpdated: new Date().toISOString(),
                blockers: [],
                debugStrikes: 0,
            };
        }

        const phaseMatch = stateContent.match(/\*\*Phase\*\*:\s*(\d+)/);
        const taskMatch = stateContent.match(/\*\*Task\*\*:\s*(.+)/);
        const statusMatch = stateContent.match(/\*\*Status\*\*:\s*(.+)/);
        const strikesMatch = stateContent.match(/\*\*Debug Strikes\*\*:\s*(\d+)/);

        return {
            phase: phaseMatch ? parseInt(phaseMatch[1]) : null,
            task: taskMatch ? taskMatch[1].trim() : null,
            status: statusMatch ? statusMatch[1].trim() : 'Unknown',
            lastUpdated: new Date().toISOString(),
            blockers: this.parseBlockers(stateContent),
            debugStrikes: strikesMatch ? parseInt(strikesMatch[1]) : 0,
        };
    }

    // ─── State Writing ───────────────────────────────────────────

    updateState(updates: Partial<SessionState>): void {
        const current = this.getCurrentState();
        const merged = { ...current, ...updates, lastUpdated: new Date().toISOString() };

        const content = `# STATE.md — Project Memory

> **Last Updated**: ${merged.lastUpdated}

## Current Position
- **Phase**: ${merged.phase ?? 'None'}
- **Task**: ${merged.task ?? 'None'}
- **Status**: ${merged.status}
- **Debug Strikes**: ${merged.debugStrikes}

## Blockers
${merged.blockers.length > 0 ? merged.blockers.map(b => `- ${b}`).join('\n') : 'None'}

## Last Session Summary
${merged.status}
`;

        this.fileManager.writeGsdFile('STATE.md', content);
    }

    // ─── Session Persistence ─────────────────────────────────────

    saveSession(summary: string): string {
        const state = this.getCurrentState();
        const sessionData = `# Session Snapshot

> **Saved**: ${new Date().toISOString()}

## Position
- **Phase**: ${state.phase ?? 'None'}
- **Task**: ${state.task ?? 'None'}
- **Status**: ${state.status}

## Summary
${summary}

## Blockers
${state.blockers.length > 0 ? state.blockers.map(b => `- ${b}`).join('\n') : 'None'}

## Next Steps
Continue from the current position.
`;

        this.updateState({ status: `Paused — ${summary}` });
        return sessionData;
    }

    restoreSession(): { success: boolean; state: SessionState; message: string } {
        const state = this.getCurrentState();

        if (!state.phase) {
            return {
                success: false,
                state,
                message: 'No session to restore. Use gsd_init to start a project.',
            };
        }

        this.updateState({ status: state.status.replace('Paused — ', '') });

        return {
            success: true,
            state,
            message: `Session restored. Phase ${state.phase}: ${state.task ?? 'Ready'}`,
        };
    }

    // ─── Debug Strike Management ─────────────────────────────────

    incrementDebugStrike(): number {
        const state = this.getCurrentState();
        const newStrikes = state.debugStrikes + 1;
        this.updateState({ debugStrikes: newStrikes });
        return newStrikes;
    }

    resetDebugStrikes(): void {
        this.updateState({ debugStrikes: 0 });
    }

    isDebugExhausted(): boolean {
        return this.getCurrentState().debugStrikes >= 3;
    }

    // ─── Private Helpers ─────────────────────────────────────────

    private parseBlockers(content: string): string[] {
        const blockersSection = content.match(/## Blockers\n([\s\S]*?)(?:\n##|\n$)/);
        if (!blockersSection) return [];

        const lines = blockersSection[1].trim().split('\n');
        return lines
            .filter(l => l.startsWith('- ') && l !== '- None')
            .map(l => l.substring(2).trim());
    }
}
