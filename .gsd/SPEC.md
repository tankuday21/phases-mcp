# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
A beautiful, modern markdown note-taking app that runs entirely in the browser. Users can create, edit, organize, and search notes written in markdown with a live preview. Notes are persisted in localStorage, and the UI features a stunning dark-mode design with smooth animations, split-pane editing, and a tagging system for organization.

## Goals
1. Build a premium dark-mode UI with split-pane markdown editor and live preview
2. Implement full CRUD operations for notes with localStorage persistence
3. Add search and tagging features for note organization
4. Create a responsive, polished single-page application with smooth animations

## Non-Goals (Out of Scope)
- Cloud sync or multi-device support
- User accounts or authentication
- Collaborative editing
- File import/export (v1)

## Users
Developers who want a lightweight, beautiful markdown note-taking app that works offline in the browser without any backend or account required.

## Constraints
- Single HTML/CSS/JS app — no frameworks or build tools
- All data stored in localStorage — no backend
- Must work offline in any modern browser

## Success Criteria
- [ ] Users can create, edit, and delete markdown notes
- [ ] Live markdown preview renders as user types
- [ ] Notes persist across browser sessions via localStorage
- [ ] Search filters notes by title/content in real-time
- [ ] Tags can be added/removed and used to filter notes
- [ ] UI is responsive, dark-themed, and visually premium
