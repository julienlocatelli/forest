## User story

**As a** <persona>,
**I want** <goal>,
**so that** <business benefit>.

## Context

<Why this story exists and what the current problem is, in 2–5 lines. No technical solution.>

- Source ticket: [<BLF-id>](<backlog ticket url>)
- Related stories: <TASK-xx links, or "none">

## Acceptance criteria

```gherkin
Feature: <feature name>

  Background:
    Given <state shared by all scenarios, only if needed>

  Scenario: <happy path behaviour>
    Given <context>
    When <user action>
    Then <observable outcome>

  Scenario: <error or edge case>
    Given <context>
    When <action>
    Then <observable outcome>
```

## Out of scope

- <What this story deliberately does not cover>

## Open questions

- <Points left unresolved after clarification, or "none">
