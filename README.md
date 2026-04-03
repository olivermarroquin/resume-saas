# Resume SaaS

## Purpose

Resume SaaS is the web-based evolution of Resume Factory.

It converts a local one-user CLI workflow into a structured web application with:

- backend services
- API endpoints
- a user-facing UI
- reusable internal logic

## Source

Primary source system:

- ~/workspace/repos/resume-factory

## Goal

Reuse the proven core engine from Resume Factory while replacing:

- shell commands
- local workflow state
- local folder routing
  with:
- backend services
- APIs
- web UI flows

## Build Principle

Do not copy the old repo structure directly.

Extract the engine.
Wrap it in services.
Expose it through APIs.
Build the UI on top.
