# Ticketing API v1

For the full RMIS registration and automatic ticket-creation implementation, see [Project-to-Ticketing integration](./project-ticketing-integration.md).

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

## RMIS automatic ticket creation

For the RMIS application, a user does not need to generate or manage a personal API key. RMIS stores one backend-only integration key and uses this endpoint after it identifies its signed-in user:

```http
POST /api/v1/integrations/rmis/tickets
Authorization: Bearer <RMIS integration key>
Content-Type: application/json
```

The body is the same as the project ticket body, plus the authenticated RMIS user's email. RMIS must derive that email from its server-side session, never trust an email supplied directly by the browser:

```json
{
  "requesterEmail": "juan@example.com",
  "title": "Unable to archive record",
  "description": "Archiving the record returns an error.",
  "priority": "normal",
  "category": "Software"
}
```

Ticketing resolves that email to its own account and only creates the ticket when the user is active, approved, and has RMIS project access. The integration key is limited to RMIS and cannot create QLEGAL tickets. Configure its value as `RMIS_TICKET_API_KEY` in Ticketing and `TICKETING_TICKET_API_KEY` in the RMIS backend.

## Account provisioning credential

`RMIS_PROVISIONING_TOKEN` is a separate server-to-server credential used only by the RMIS account synchronization endpoint. It cannot authenticate ticket API requests and must not be issued to users.
