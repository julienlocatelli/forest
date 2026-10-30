# Tool or library evaluation

Evaluate one tool or library against what Forest uses today, so the user can adopt it, reject it or try it. Judge it on Forest's real setup, not on the tool's own pitch.

The report covers:

1. **What it would replace or add.** The current tool and where Forest uses it, with `path:line` evidence: config files, `package.json` scripts, CI steps, skills that call it. Or that nothing covers the need today.
2. **Fit with Forest.** Support for what Forest runs: bun and the workspaces, Node version from mise, TypeScript, NestJS and Next.js where relevant, and the CI runner. Each point cites the tool's official documentation, with the version it describes.
3. **Migration cost.** The files, scripts, CI steps and skills to change, counted from the repository, and whether both tools can run side by side during the move.
4. **Risks.** Maturity (release cadence, last release date), maintenance, license, lock-in, and the features Forest uses today that the tool lacks.
5. **Verdict.** Adopt, try on a small scope first, or reject, tied to the findings that decide it.

Done when each of the five points has evidence or sits in the open questions. A benchmark or trial that would need a dependency install is an open question, never a run.
