
Contributing documentation
==========================

Add your project or personal documentation under a named folder in this `doc/` tree.

How to add files
- Create a folder named for you or your team under `doc/`, e.g. `doc/alice/` or `doc/frontend-team/`.
- Add a `README.md` in that folder with a short overview.
- Add other markdown files as needed, for example `overview.md`, `design.md`, `how-to.md`.

Recommended front-matter (optional)
```
---
title: Short descriptive title
author: Your Name
date: 2026-01-12
tags: [design,api]
---
```


File naming and structure
- Prefer kebab-case filenames: `api-design.md`, `user-guide.md`.
- Keep each topic in its own file; break large docs into sections.

Workflow
- Create a branch, add your `doc/<your-name>/` folder and files, then open a PR against `main`.
- In the PR description include a one-line summary and any reviewers to request.

Style and best-practices
- Write concise headings, use code blocks for examples, and include links to related docs.
- If your document is a spec, include a short summary and a status (draft/reviewed/final).

Contact
- If you need guidance, ping the docs owner or open an issue.

Example
- `doc/alice/README.md`
- `doc/alice/overview.md`

Thank you for keeping documentation organized and discoverable.
