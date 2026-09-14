# Security Policy

## Reporting a vulnerability

Report privately through GitHub's vulnerability reporting form:
https://github.com/suavesav/skillset/security/advisories/new

Do not open a public issue for a security report.

## Scope

This repository contains markdown files, shell scripts, and a viewer web
app. There are three relevant surfaces:

- The hosted viewer at https://suavesav.github.io/skillset/ is a static
  site: no server, no accounts, no data collection.
- The plugin build (`platforms/claude-plugin/build.sh`) and other platform
  scripts run on the user's own machine.
- The repository content itself (skills, agents, knowledge files, scripts).

## What's in scope

- Path traversal in the platform scripts' `--emit` handling.
- Anything in the committed `dist/` that differs from what `build.sh`
  produces.
- Dependency vulnerabilities in `viewer/`.

## What's out of scope

There is no server and no user data, so reports about accounts, sessions,
or server-side data handling do not apply here.

No bug bounty is offered.
