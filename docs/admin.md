# Administration

Open `/admin`, or Account → Quản trị, after signing in with Google.
`OWNER_EMAIL` identifies the verified Google email permitted to own the site.
There is no first-user ownership claim, email-based local-account linking, or
production test-login endpoint. The first real request from an existing signed
Google session registers that identity in the central user directory.

Production requires `DATABASE_URL` pointing to PostgreSQL. Railway references
the private Postgres service (`${{Postgres.DATABASE_URL}}`) with a persistent
volume. The web service must retain `SESSION_SECRET` across deployments.
Development uses PGlite in ignored `.data/admin/` when DATABASE_URL is absent.
Schema initialization is additive and idempotent; seed lessons are inserted
only if missing. Editing, archiving or deleting a lesson never causes it to be
overwritten by a redeployment.

| Role | Default access |
| --- | --- |
| Owner | Every permission, protected against UI demotion/disable |
| Admin | Users, roles, invitations, all content operations and audit |
| Editor | Administration, reading content, writing drafts |
| Moderator | Reading users, disabling/unblocking accounts, revoking sessions, reading content and audit |
| Player | Game, published content |

The owner/admin can customize each user's permissions. An actor can grant only
permissions they hold, cannot manage a target with higher permissions, and
cannot change their own administrative permissions or disable themselves.
The owner is managed through verified identity and server configuration.
Administrative writes check a fresh database user inside a transaction, check
the browser Origin and serialize against role changes. Signed cookies carry
identity and a session version; every admin API request reads permissions from
the database. Disabling or revoking increments the session version, invalidating
all previous cookies. Re-enabling requires a fresh Google login.

User controls include search, filters, pagination, per-user role/permission
editing, lock/unlock and session revocation. Email grants last seven days and
apply on the first matching Google login. They send no email; an administrator
shares the website URL themselves. A grant can be canceled before use.

Content supports lessons, announcements and events, with draft/published/archived
states, previews, duplicate-as-draft, soft deletion and restore-as-draft.
Existing published content requires publishing permission even when editing it
back to draft. Optimistic revisions prevent stale edits from overwriting a
colleague's work. Restored content must be published explicitly.

Published lessons appear in the game library; announcements appear in the lobby,
and events in the events page. The public API excludes drafts, deleted content
and administrator emails. The browser updates its lesson cache at launch and
when opening the library; personal imported lessons and learning records remain.
An unavailable API leaves the last local lesson cache usable.

The central directory manages server-verified Google users. Legacy password
accounts and game progress/coins remain local to their browser, and are not
silently uploaded or trusted for server privileges. Forum posts and reward
claims remain local; managed events are event descriptions, not automatic rewards.

Audit logs capture actor, target and administrative changes, without passwords,
OAuth codes, client secrets or provider tokens. Logs are append-only through
the application API. Back up PostgreSQL and configure retention according to
your operating needs; the application never exposes a public database endpoint.

Validation: `npm test`, `npm run test:server`, `npm run test:e2e`, `npm run build`.
Server integration tests use real SQL with PGlite, a test-only Google mock, and
HTTP requests through the same router as production. Browser tests mock APIs
inside their isolated browser contexts; production has no bypass.
