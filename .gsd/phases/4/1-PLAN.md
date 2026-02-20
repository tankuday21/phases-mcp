---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: floating-format-toolbar

## Objective
Build a Notion-style floating toolbar that appears on text selection with formatting commands

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md

## Tasks

<task type="auto">
  <name>Floating Format Toolbar</name>
  <files>app/index.html, app/style.css, app/app.js</files>
  <action>
    Add floating toolbar HTML to index.html. Add CSS for the toolbar with absolute positioning, glassmorphism background, fade animation, and button hover states. Implement JS to detect text selection in the textarea, position the toolbar above the selection, and apply markdown formatting on button click.
  </action>
  <verify>Select text in editor, verify toolbar appears and formatting buttons work correctly</verify>
  <done>Selecting text shows a floating toolbar above it. Clicking Bold wraps text in **, Italic in *, Code in `, etc. Toolbar disappears on deselect.</done>
</task>

## Success Criteria
- [ ] Floating toolbar appears above selected text in the editor
- [ ] Toolbar has buttons for Bold, Italic, Strike, Code, Heading, Link, Quote, List
- [ ] Clicking a format button wraps selected text with correct markdown syntax
- [ ] Toolbar disappears when selection is cleared or clicking outside
- [ ] Toolbar has smooth fade-in animation and premium styling
