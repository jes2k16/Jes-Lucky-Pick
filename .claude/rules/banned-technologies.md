---
description: Technologies and libraries that must never be used in this project
globs: **/*
---

## Banned Technologies

DO NOT use any of the following:

**Frameworks**: Next.js, Angular
**State Management**: Redux, Formik
**CSS**: custom CSS files (use Tailwind utility classes and Shadcn/ui CSS variables in index.css only), Syncfusion
**Charts**: Recharts
**AI/ML**: Semantic Kernel
**Testing**: Jest, Cypress, Moq
**Database**: synchronous DB calls (all EF Core calls must be async)
