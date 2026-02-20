---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: core-ui-and-editor

## Objective
Build the complete HTML structure, CSS design system with dark theme, and split-pane markdown editor with live preview

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md

## Tasks

<task type="auto">
  <name>HTML Structure & CSS Design System</name>
  <files>app/index.html, app/style.css</files>
  <action>
    Create index.html with semantic HTML5 structure: sidebar for notes list, main area with split-pane editor (textarea + preview div), and a top toolbar. Create style.css with a premium dark-mode design system using CSS custom properties, glassmorphism effects, smooth gradients, and modern typography (Inter from Google Fonts).
  </action>
  <verify>Open index.html in browser and verify dark theme renders correctly with sidebar and split-pane layout</verify>
  <done>HTML structure is complete with sidebar, toolbar, editor pane, and preview pane. Dark-mode CSS design system with custom properties is applied.</done>
</task>

<task type="auto">
  <name>Markdown Editor with Live Preview</name>
  <files>app/index.html, app/style.css, app/app.js</files>
  <action>
    Create app.js that implements: (1) a lightweight markdown-to-HTML converter supporting headers, bold, italic, code blocks, inline code, links, lists, blockquotes, and horizontal rules; (2) real-time preview that renders as user types in the textarea; (3) split-pane resize handle for adjusting editor/preview widths.
  </action>
  <verify>Type markdown in editor textarea, verify it renders as formatted HTML in the preview pane in real-time</verify>
  <done>Markdown text typed in the editor is parsed and rendered as formatted HTML in the live preview pane. Split-pane is resizable.</done>
</task>

## Success Criteria
- [ ] Dark-mode UI renders with sidebar, toolbar, editor, and preview panes
- [ ] Markdown typed in editor is rendered as HTML in preview in real-time
- [ ] Split-pane divider can be dragged to resize editor and preview
- [ ] Design uses premium aesthetics: glassmorphism, gradients, smooth fonts
