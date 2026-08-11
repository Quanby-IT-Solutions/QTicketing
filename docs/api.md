# Ticketing API v1

For project registration synchronization and automatic ticket creation, see [Project-to-Ticketing integration](./project-ticketing-integration.md).

The Ticketing API supports server-to-server ticket creation using user-owned API keys. Keep API keys in the calling project's backend or secret manager; never embed them in browser or mobile application code.

## Authentication

Create an API key from **Settings → API keys** while signed in to Ticketing. The raw key is shown once and has this general format:

```text
qtk_live_<random-secret>
```

Send the complete key in the `Authorization` header:

```http
Authorization: Bearer qtk_live_<random-secret>
```

API keys act as their owning Ticketing user. Revoked or expired keys, disabled users, unapproved users, and users without access to the requested project are rejected. Project permissions are checked from the database on every request.

### Development seed bearer (no expiry)

For local development or a controlled non-production environment, `scripts/seed.ts` can create a lifetime API key for the seeded admin. Add a generated `qtk_live_...` value to the Ticketing environment before running the seed:

```env
SEED_API_KEY=qtk_live_<43-url-safe-random-characters>
```

```bash
pnpm db:seed
```

The key is stored only as a hash, has no expiry, and is created idempotently. Use the same `SEED_API_KEY` value in requests:

```http
Authorization: Bearer qtk_live_<your-seed-api-key>
```

Do not use a permanent seeded key in production. For production integrations, create a scoped user key from **Settings → API keys** and rotate it regularly.

## Per-project backend setup

Every project backend uses the same Ticketing API host and a `qtk_live_...` user API key. Set these values in the backend environment only; do not expose them to the project web application.

```env
TICKETING_API_URL=https://ticketing.quanbyit.com
SEED_API_KEY=qtk_live_<project-backend-api-key>
```

Use the project code that matches the Ticketing project record:

| Project system                       | Ticketing project code | Ticket endpoints begin with |
| ------------------------------------ | ---------------------- | --------------------------- |
| Record Management Information System | `RMIS`                 | `/api/v1/projects/RMIS`     |
| QLegal                               | `QLEGAL`               | `/api/v1/projects/QLEGAL`   |
| Document Management System           | `DMS`                  | `/api/v1/projects/DMS`      |
| CIvil Registry Information System    | `CRIS`                 | `/api/v1/projects/CRIS`     |
| Human Resource Information System    | `HRIS`                 | `/api/v1/projects/HRIS`     |
| Learning Management System           | `LMS`                  | `/api/v1/projects/LMS`      |

The API key owner must have access to that Ticketing project. Create and activate a project in Ticketing before connecting its backend. The seed script includes the project codes above; run `pnpm db:seed` after updating an existing development database.

## Create a project ticket

```http
POST /api/v1/projects/{projectCode}/tickets
Authorization: Bearer <user-api-key>
Content-Type: application/json
```

Project codes are case-insensitive and normalized to uppercase. Examples:

```text
POST /api/v1/projects/RMIS/tickets
POST /api/v1/projects/QLEGAL/tickets
```

Request body:

```json
{
  "title": "Unable to archive record",
  "description": "Archiving the record returns an error.",
  "priority": "normal",
  "category": "Software",
  "department": "Records",
  "location": "Main Office",
  "dueDate": "2026-08-20"
}
```

`priority` accepts `low`, `normal`, or `high`. Optional fields may be omitted. The API always derives the project from the URL and the requester from the API key; it does not accept caller-controlled `projectId`, `requesterId`, `status`, or `assigneeId` values.

Example request:

```bash
curl --request POST \
  --url "https://ticketing.quanbyit.com/api/v1/projects/RMIS/tickets" \
  --header "Authorization: Bearer $TICKETING_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "Unable to archive record",
    "description": "Archiving the record returns an error.",
    "priority": "normal",
    "category": "Software"
  }'
```

The JSON endpoint does not accept attachments. Add files through Ticketing after creation until a multipart attachment endpoint is introduced.

## Read, update, and delete tickets

All ticket operations use the same user API key and require the key owner to have current access to `{projectCode}`.

| Method   | Endpoint                                            | Purpose                                             |
| -------- | --------------------------------------------------- | --------------------------------------------------- |
| `GET`    | `/api/v1/projects/{projectCode}/tickets?limit=50`   | List up to 100 project tickets, newest update first |
| `GET`    | `/api/v1/projects/{projectCode}/tickets/{ticketId}` | Get one ticket                                      |
| `PATCH`  | `/api/v1/projects/{projectCode}/tickets/{ticketId}` | Update editable ticket fields                       |
| `DELETE` | `/api/v1/projects/{projectCode}/tickets/{ticketId}` | Delete a ticket; returns `204`                      |

Example update:

```http
PATCH /api/v1/projects/QLEGAL/tickets/9a73e5fa-0ee0-4db1-a449-4608f1240c9c
Authorization: Bearer qtk_live_<user-api-key>
Content-Type: application/json
```

```json
{
  "status": "ongoing",
  "priority": "high",
  "dueDate": "2026-08-20"
}
```

`PATCH` accepts any combination of `title`, `description`, `status` (`pending`, `ongoing`, `done`), `priority`, `category`, `department`, `location`, and `dueDate`. Ticket status changes are recorded in the status history. It does not accept a different requester, project, or assignee.

## Comments and replies

Comments use the same project and ticket path. A reply is a comment with `parentCommentId`; replies can themselves be replied to, producing a single nested conversation chain.

| Method   | Endpoint                                                                 | Purpose                                                                |
| -------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `GET`    | `/api/v1/projects/{projectCode}/tickets/{ticketId}/comments`             | List comments in chronological order                                   |
| `POST`   | `/api/v1/projects/{projectCode}/tickets/{ticketId}/comments`             | Add a comment or reply                                                 |
| `PATCH`  | `/api/v1/projects/{projectCode}/tickets/{ticketId}/comments/{commentId}` | Edit your own comment; admins may edit any comment                     |
| `DELETE` | `/api/v1/projects/{projectCode}/tickets/{ticketId}/comments/{commentId}` | Delete your own comment and its replies; admins may delete any comment |

Create a root comment:

```json
{
  "body": "We have applied the requested fix. Please verify it."
}
```

Reply to an existing comment:

```json
{
  "body": "Confirmed, thank you.",
  "parentCommentId": "9a73e5fa-0ee0-4db1-a449-4608f1240c9c"
}
```

Comment endpoints accept JSON only. Attachment upload is not yet available through the API.

## Automatic ticket creation from any project

An integrated project does not need each user to generate a personal key. The project backend stores the integration key and uses its project code after it identifies the signed-in user:

```http
POST /api/v1/integrations/{projectCode}/tickets
Authorization: Bearer <TICKETING_TICKET_API_KEY>
Content-Type: application/json
```

The body is the same as the project ticket body, plus the authenticated user's email. The project backend must derive that email from its server-side session, never trust an email supplied directly by the browser:

```json
{
  "requesterEmail": "juan@example.com",
  "title": "Unable to archive record",
  "description": "Archiving the record returns an error.",
  "priority": "normal",
  "category": "Software"
}
```

Ticketing resolves that email to its own account and only creates the ticket when the user is active, approved, and has the route project's access. Configure the global secret as `TICKETING_TICKET_API_KEY` in Ticketing and use the same value as `TICKETING_TICKET_API_KEY` in each approved project backend.

## Account provisioning credential

`TICKETING_PROVISIONING_TOKEN` is a separate server-to-server credential used only by account synchronization endpoints. It cannot authenticate ticket API requests and must not be issued to users.
