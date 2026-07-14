# Product

## Register

product

## Users

TypeScript and Flue developers evaluating OpenComputer or deploying their first Flue agent. They
are usually in a terminal with the repository freshly cloned and need a working result before they
need platform internals.

## Product Purpose

Provide the smallest honest Flue application that demonstrates the supported OpenComputer path. A
developer should be able to install it, deploy a fresh agent, start a session, observe a useful
multi-turn result, and understand where to add tools, packaged skills, variables, secrets, or an
optional sandbox.

## Brand Personality

Calm, direct, technical. The starter should feel maintained and unsurprising: concise enough to
scan, specific enough to trust, and candid about current boundaries.

## Anti-references

- A showcase that foregrounds Cloudflare or other underlying infrastructure instead of
  OpenComputer running the agent.
- Internal rollout names, development generations, tactical workarounds, or speculative features.
- Copy that uses “harness” as a generic runtime noun rather than its familiar coding-agent CLI
  meaning.
- Partial snippets, placeholder commands that fail when pasted, or demo prompts that contradict the
  fixture data.
- Claims about sandboxes, repositories, channels, attachments, credentials, or rollback behavior
  that the current product does not support.

## Design Principles

1. Put a successful deploy and session first; explain architecture after the first runnable path.
2. Keep every command and example copy-pasteable and validate it against the checked-in app.
3. Teach one concept at a time through real files: agent, tool, packaged skill, then optional sandbox.
4. Present OpenComputer as the platform that runs the agent; mention substrate details only when they
   explain behavior or operational constraints.
5. Prefer an explicit limitation over a polished but false promise.

## Accessibility & Inclusion

Use semantic Markdown headings, descriptive link text, readable line lengths, and text that does not
depend on color or icons. Commands must remain understandable when copied from a terminal or read by
a screen reader. Expand acronyms and platform-specific terms on first use when the surrounding code
does not already make them clear.
