---
type: spec
status: draft
created: 2026-04-03
updated: 2026-05-06
project: resume-saas
domains: [app-building]
tags: [spec, resume-saas]
---

# Resume SaaS – Overview

## Goal

Turn my existing resume-factory system into a web-based application that allows users to generate tailored resumes easily.

## Source System

Primary source:

- /repos/resume-factory

This system already:

- processes job data
- generates tailored resumes
- runs via CLI (bash + python)

## Problem

Current system:

- only works locally
- only usable by me
- requires CLI knowledge
- not accessible to other users

## Target Outcome

Create a web app that:

- allows users to input job info or upload data
- generates tailored resumes automatically
- provides a simple UI instead of CLI commands
- can scale beyond a single user

## Core Idea

Take the existing logic and transform:

CLI workflow → API + UI workflow

## Key Transformations Needed

1. Input Layer

- replace CLI inputs with forms or uploads

2. Processing Layer

- reuse existing Python logic where possible
- convert into backend services or APIs

3. Output Layer

- return generated resumes through UI
- allow download or storage

## MVP Scope

First version should:

- allow a user to input job details
- run resume generation logic
- output a downloadable resume
- not worry about scaling yet
- not overcomplicate authentication or billing

## Constraints

- reuse as much existing logic as possible
- avoid rewriting everything from scratch
- keep MVP simple and functional

## Future Features (Later)

- user accounts
- saved resumes
- multiple resume versions
- analytics / tracking
- subscription model

## Why This Matters

This is:

- a real working system already
- a strong candidate for a product
- a fast way to test SaaS direction

## Relationship to System

This project will use:

- app-factory → to scaffold the web app
- resume-factory → as the core logic source
- ai-agency-core → for shared templates and standards (future)
- ai-factory → for workflows and automation (future)

## Success Criteria

This project is successful when:

- I can generate resumes through a UI
- the system works without CLI
- it can be used by someone other than me

## Summary

Resume SaaS is the first step in turning my internal tools into real products. It converts a working local system into a scalable, user-facing application.
