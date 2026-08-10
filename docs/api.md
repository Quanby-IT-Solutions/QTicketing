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

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/projects/{projectCode}/tickets?limit=50` | List up to 100 project tickets, newest update first |
| `GET` | `/api/v1/projects/{projectCode}/tickets/{ticketId}` | Get one ticket |
| `PATCH` | `/api/v1/projects/{projectCode}/tickets/{ticketId}` | Update editable ticket fields |
| `DELETE` | `/api/v1/projects/{projectCode}/tickets/{ticketId}` | Delete a ticket; returns `204` |

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
