---
type: spec
status: draft
created: 2026-04-03
updated: 2026-05-06
project: resume-saas
domains: [app-building]
tags: [spec, resume-saas, resume-factory]
---

# Resume SaaS Source Analysis

## Purpose

This document will capture what exists in resume-factory and what should carry forward into resume-saas.

## Questions to Answer

- what are the main entrypoints in resume-factory?
- which parts are core business logic?
- which parts are shell wrappers or workflow glue?
- what inputs does the system expect?
- what outputs does it generate?
- what assumptions are hardcoded for one user?
- what should be reused directly?
- what should be redesigned for web use?

## Initial Hypothesis

The likely split is:

### Keep / Reuse

- core resume generation logic
- prompt generation logic
- document handling logic
- validation patterns
- structured workflow knowledge

### Replace / Redesign

- bash command entrypoints
- manual local flow assumptions
- filesystem assumptions tied to one user workflow
- CLI-only ergonomics

## Goal

Use this analysis to avoid guessing when the actual build starts.
