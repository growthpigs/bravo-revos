# Gemini Agent Context & Status

**Last Updated:** November 24, 2025
**Agent:** Gemini CLI
**Repo:** growthpigs/bravo-revos
**Branch:** staging

## 1. Project Overview
Bravo RevOS is a multi-tenant SaaS for marketing agencies, featuring AI-driven content generation, LinkedIn automation (via Unipile), and engagement pods.

## 2. Current Mission: "Write Workflow" & LinkedIn Integration
We are currently finalizing the "Write Workflow" (Quick Post Creation) and the underlying LinkedIn Publishing architecture.

### Key Components
*   **WriteChip (`lib/chips/write-chip.ts`):** Handles the "Write" workflow (Topic Selection -> Content Generation -> Finalization).
*   **PublishingChip (`lib/chips/publishing-chip.ts`):** Handles the actual posting to LinkedIn.
*   **Unipile Client (`lib/unipile-client.ts`):** The low-level API client for LinkedIn interactions.
*   **FloatingChatBar (`components/chat/FloatingChatBar.tsx`):** The main UI for the AI chat and document interactions.

## 3. Active Tasks & Status

### ✅ Completed
*   **Fix "Zombie Post" Risk:** Implemented a robust "Draft -> API Call -> Published" transaction flow in `PublishingChip` to prevent data loss if the DB update fails after a successful API call.
*   **Fix Mock Mode Safety:** Hardened `isMockMode()` in `UnipileClient` to strictly check for 'true'/'1' and default to `false` (Real Mode) in production.
*   **Fix Account Selection:** Updated `PublishingChip` to handle multiple LinkedIn accounts safely (Prompt user if ambiguous, validate ID if provided).

### 🚧 In Progress
*   **Fix "Talent Myth" UI Bug:** The `FloatingChatBar` incorrectly handles inline button clicks for topic selection, dumping raw JSON/text into the chat input instead of triggering the correct workflow step.
    *   *Action:* Refactor `handleActionClick` in `FloatingChatBar.tsx`.

### ⏳ Pending
*   **Verify Timeouts:** Test if the synchronous `createLinkedInPost` call causes timeouts in the Agent context.
*   **Deployment Verification:** Confirm fixes in the staging environment.

## 4. Architectural Notes
*   **Mock Mode:** Controlled by `UNIPILE_MOCK_MODE`. Must be `false` for real posting.
*   **Data Model:** `posts` table links to `linkedin_accounts` via `linkedin_account_id`.
*   **Agent Protocol:** The frontend (`FloatingChatBar`) communicates with the backend agent via structured messages. Button clicks should send natural language user messages or trigger tool calls explicitly.

## 5. Development Protocol
*   **Branching:** All work on `staging`.
*   **Commits:** Use semantic commit messages (e.g., `fix(linkedin): ...`).
*   **Status Line:** Always include Repo and Branch in agent outputs.