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

## Running the dev servers

Two processes in two terminals.

Backend (Flask, port 8080):

    cd repos/resume-saas
    .venv/bin/flask --app app run --port 8080

Frontend (Next.js, port 3001 or 3000):

    cd repos/resume-saas/frontend
    npm run dev

The frontend proxies `/api/*` requests to `http://localhost:8080/api/*`
via a Next.js rewrite rule in `next.config.ts`, so the browser only
talks to the Next.js origin. No CORS configuration needed in dev.

## Running the backend tests

    cd repos/resume-saas
    .venv/bin/python -m pytest tests/backend -v
