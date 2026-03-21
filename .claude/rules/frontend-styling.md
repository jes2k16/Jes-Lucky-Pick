---
description: Rules for styling frontend components
globs: src/jes-lucky-pick-client/**/*.{tsx,ts,css}
---

## Frontend Styling Rules

- Use Tailwind utility classes only — no standalone custom CSS files
- `index.css` is for Tailwind imports, CSS custom properties (Shadcn/ui theme tokens), and `@theme inline` — this is configuration, not custom CSS
- Use Shadcn/ui semantic color classes (`text-foreground`, `bg-card`, `text-primary`, `text-muted-foreground`, `border-border`, `bg-accent`, `text-destructive`) instead of hardcoded Tailwind colors (e.g., `text-gray-900`, `bg-white`, `text-indigo-600`)
- Exception: domain-specific colors may stay hardcoded (e.g., NumberBall colors, chart colors, money amounts in green)
- Dark mode via `.dark` class on `<html>` — use CSS variables so a single class works for both modes, avoid manual `dark:` variants when a semantic class exists
- Path alias `@` maps to `./src`
