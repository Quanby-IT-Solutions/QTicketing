# Project-to-Ticketing integration

Use this guide when another Quanby project, such as RMIS, QLEGAL, DMS, LMS, or HRIS, needs to keep its own user database while also creating matching users and tickets in Ticketing.

The external project remains the source of truth for its own account. It saves the account in its database first, then calls Ticketing from its backend. Do not call Ticketing directly from browser code: every Ticketing secret belongs only in the external project's backend environment or secret manager.

## Required deployment secrets

Use different random secrets for account provisioning and ticket creation.

```env
# Example: RMIS deployment. Give every project two distinct secrets.
# For QLEGAL, use QLEGAL_PROVISIONING_TOKEN and QLEGAL_TICKET_API_KEY instead.
RMIS_PROVISIONING_TOKEN=<random-32-or-more-character-secret>
RMIS_TICKET_API_KEY=<another-random-32-or-more-character-secret>

# RMIS backend deployment (the values match Ticketing's two RMIS values)
TICKETING_API_URL=https://ticketing.quanbyit.com
TICKETING_PROVISIONING_TOKEN=<same-value-as-RMIS_PROVISIONING_TOKEN>
TICKETING_TICKET_API_KEY=<same-value-as-RMIS_TICKET_API_KEY>
```

Run the Ticketing API-key migration before deployment:

```bash
pnpm db:migrate
```

## 1. Register a user in both databases

When a user registers in a project, create that project's user with its existing registration code first. After that local database operation succeeds, call the matching Ticketing user-provisioning endpoint from the project's backend.

The currently implemented server-to-server provisioning endpoint is RMIS:

```http
POST /api/v1/integrations/rmis/users
Authorization: Bearer <TICKETING_PROVISIONING_TOKEN>
Content-Type: application/json
```

```json
{
  "name": "Juan Dela Cruz",
  "email": "juan@example.com",
  "password": "the-user-registration-password"
}
```

Ticketing creates the user as an active, approved requester and grants the `RMIS` project. Repeated calls are safe: Ticketing does not create a duplicate user or duplicate project assignment.

Example server-side RMIS registration flow:

```ts
type RegistrationInput = {
  name: string
  email: string
  password: string
}

export async function registerRmisUser(input: RegistrationInput) {
  // 1. Existing RMIS registration. This writes the account to the RMIS DB.
  const rmisUser = await createRmisUserInDatabase(input)

  // 2. Copy the account to Ticketing from the RMIS backend only.
  const response = await fetch(
    `${process.env.TICKETING_API_URL}/api/v1/integrations/rmis/users`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TICKETING_PROVISIONING_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: rmisUser.name,
        email: rmisUser.email,
        password: input.password,
      }),
    },
  )

  if (!response.ok) {
    // Do not log the password or either secret. Record a retryable sync failure.
    throw new Error("Ticketing user provisioning failed")
  }

  return rmisUser
}
```

There is no shared transaction between the project database and Ticketing. If Ticketing is temporarily unavailable, keep the successful local registration and retry the Ticketing provisioning call on the user's next successful email login. The existing RMIS Better Auth hook already follows this pattern.

For QLEGAL, DMS, LMS, or HRIS, use the same sequence but give the project its own provisioning endpoint and secret, for example `POST /api/v1/integrations/qlegal/users` with `QLEGAL_PROVISIONING_TOKEN`. That endpoint must grant only the matching `QLEGAL` project—never accept the project code from the browser or request body.

## 2. Create a ticket automatically from a project

For the normal project application flow, the project backend uses one integration key. It identifies the current project user from its own server-side session and sends that user's email. Ticketing checks that the matching Ticketing user is active, approved, and still has access to that exact project before creating the ticket under that user's name.

The currently implemented automatic ticket endpoint is RMIS:

```http
POST /api/v1/integrations/rmis/tickets
Authorization: Bearer <TICKETING_TICKET_API_KEY>
Content-Type: application/json
```

```json
{
  "requesterEmail": "juan@example.com",
  "title": "Unable to archive a record",
  "description": "Archiving the record returns an error.",
  "priority": "normal",
  "category": "Software",
  "department": "Records",
  "location": "Main Office",
  "dueDate": "2026-08-20"
}
```

Server-side RMIS example:

```ts
type CreateRmisTicketInput = {
  title: string
  description: string
  priority?: "low" | "normal" | "high"
  category: string
  department?: string
  location?: string
  dueDate?: string // YYYY-MM-DD
}

export async function createTicketInTicketing(
  rmisSessionUser: { email: string },
  input: CreateRmisTicketInput,
) {
  const response = await fetch(
    `${process.env.TICKETING_API_URL}/api/v1/integrations/rmis/tickets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TICKETING_TICKET_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requesterEmail: rmisSessionUser.email, // from the backend session, never from the browser body
        ...input,
      }),
    },
  )

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.error?.message ?? "Ticketing ticket creation failed")
  }

  return response.json()
}
```

Successful responses return `201 Created` with the Ticketing ticket ID and ticket number. The endpoint only creates `RMIS` tickets. The RMIS key cannot create QLEGAL, DMS, LMS, or HRIS tickets.

For every additional project, create the equivalent locked-down endpoint and key, such as `POST /api/v1/integrations/qlegal/tickets` with `QLEGAL_TICKET_API_KEY`. It must always derive the project from the route/configuration and only create QLEGAL tickets. Do not use one universal integration secret that can create tickets in every project.

## 3. Personal API-key ticket creation

Use this only when an individual Ticketing user needs to call the Ticketing API directly from a trusted backend or automation. The user signs in to Ticketing, opens **Settings → API keys**, creates a key, and copies the one-time `qtk_live_...` value.

```http
POST /api/v1/projects/RMIS/tickets
Authorization: Bearer qtk_live_<user-api-key>
Content-Type: application/json
```

```json
{
  "title": "Unable to archive a record",
  "description": "Archiving the record returns an error.",
  "priority": "normal",
  "category": "Software"
}
```

The API key represents its Ticketing owner. It can create tickets only in projects the owner can currently access. For example, the same key can call `/api/v1/projects/QLEGAL/tickets` only if the owner has QLEGAL access; it can call `/api/v1/projects/DMS/tickets` only if it also has DMS access. This endpoint already supports every active project code.

## Access results

| Condition | Result |
| --- | --- |
| User is active, approved, and has the endpoint's project access | Ticket is created under that user |
| User is disabled or not approved | `403 REQUESTER_FORBIDDEN` |
| User no longer has the endpoint's project access | `403 REQUESTER_FORBIDDEN` |
| RMIS integration key is missing or wrong | `401 UNAUTHORIZED` |
| Endpoint project is inactive or missing | `503 PROJECT_UNAVAILABLE` |
| Invalid ticket data | `400 VALIDATION_ERROR` |

The JSON ticket endpoints do not upload attachments. Add Ticketing attachments after ticket creation until a multipart attachment endpoint is available.
