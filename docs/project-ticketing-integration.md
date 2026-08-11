# Project-to-Ticketing integration

Use this guide to connect any Quanby project—RMIS, QLEGAL, DMS, CRIS, LMS, HRIS, or a future project—to Ticketing. Each project keeps its own database and calls Ticketing from its backend to synchronize users and create tickets.

The project backend is the only caller of these integration endpoints. Do not expose either secret or call these endpoints from browser code.

## One-time Ticketing configuration

Configure these two secrets once in the Ticketing deployment. They work for every active Ticketing project.

```env
TICKETING_PROVISIONING_TOKEN=<random-32-or-more-character-secret>
TICKETING_TICKET_API_KEY=<another-random-32-or-more-character-secret>
```

Each connected project backend uses the same values under the same names:

```env
TICKETING_API_URL=https://ticketing.quanbyit.com
TICKETING_PROVISIONING_TOKEN=<same-value-as-Ticketing-TICKETING_PROVISIONING_TOKEN>
TICKETING_TICKET_API_KEY=<same-value-as-Ticketing-TICKETING_TICKET_API_KEY>
```

When you add QLEGAL, DMS, LMS, or another project, create and activate that project in Ticketing. No additional Ticketing environment variable or redeploy is required.

## Integration URLs

Replace `{PROJECT_CODE}` with the Ticketing project code, for example `RMIS`, `QLEGAL`, or `DMS`. The code is case-insensitive.

| Purpose | Endpoint | Credential |
| --- | --- | --- |
| Sync a registered user | `POST /api/v1/integrations/{PROJECT_CODE}/users` | `TICKETING_PROVISIONING_TOKEN` |
| Create a ticket as the synced user | `POST /api/v1/integrations/{PROJECT_CODE}/tickets` | `TICKETING_TICKET_API_KEY` |

The project comes from the URL, not the JSON body. A call to `/api/v1/integrations/QLEGAL/tickets` can create only QLEGAL tickets.

## 1. Save the user locally, then provision Ticketing

First use the project's existing registration flow to save the account in its own database. Once that succeeds, its backend calls Ticketing to create or update the matching Ticketing account and grant access to that project.

```http
POST /api/v1/integrations/QLEGAL/users
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

Ticketing creates an active, approved requester and assigns QLEGAL access. The operation is idempotent: repeating it does not create duplicate users or project assignments.

```ts
type RegistrationInput = {
  name: string
  email: string
  password: string
}

export async function registerProjectUser(input: RegistrationInput) {
  // 1. The existing project registration writes to its own database.
  const localUser = await createProjectUserInDatabase(input)

  // 2. The project backend provisions Ticketing. Never run this in the browser.
  const response = await fetch(
    `${process.env.TICKETING_API_URL}/api/v1/integrations/QLEGAL/users`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TICKETING_PROVISIONING_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: localUser.name,
        email: localUser.email,
        password: input.password,
      }),
    },
  )

  if (!response.ok) {
    // Never log the password or secret. Record a retryable sync failure.
    throw new Error("Ticketing user provisioning failed")
  }

  return localUser
}
```

There is no shared transaction across the project and Ticketing databases. If Ticketing is temporarily unavailable, keep the successful local registration and retry the idempotent provisioning request on the user's next successful login.

## 2. Create a ticket from any project

The project backend identifies the signed-in local user from its server-side session, then calls the matching Ticketing project route. Ticketing resolves that email to its own account and checks that the account is active, approved, and currently assigned to the requested project.

```http
POST /api/v1/integrations/QLEGAL/tickets
Authorization: Bearer <TICKETING_TICKET_API_KEY>
Content-Type: application/json
```

```json
{
  "requesterEmail": "juan@example.com",
  "title": "Unable to submit a legal request",
  "description": "The request form shows an error after submission.",
  "priority": "normal",
  "category": "Software",
  "department": "Legal",
  "location": "Main Office",
  "dueDate": "2026-08-20"
}
```

```ts
type CreateTicketInput = {
  title: string
  description: string
  priority?: "low" | "normal" | "high"
  category: string
  department?: string
  location?: string
  dueDate?: string
}

export async function createTicketInTicketing(
  sessionUser: { email: string },
  input: CreateTicketInput,
) {
  const response = await fetch(
    `${process.env.TICKETING_API_URL}/api/v1/integrations/QLEGAL/tickets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TICKETING_TICKET_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requesterEmail: sessionUser.email, // derive on the backend, never trust browser input
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

A successful response is `201 Created` and includes the Ticketing ticket ID and number. JSON integration endpoints do not accept attachments yet.

## 3. Individual Ticketing API keys

For trusted automations owned by a specific Ticketing user, create a one-time `qtk_live_...` key in **Settings → API keys** and use:

```http
POST /api/v1/projects/QLEGAL/tickets
Authorization: Bearer qtk_live_<user-api-key>
Content-Type: application/json
```

This user key works only for projects the key owner currently has access to. It is separate from the shared project-backend integration secrets.

## Expected results

| Condition | Result |
| --- | --- |
| User is active, approved, and has the URL project's access | Ticket is created under that user |
| User is disabled, pending, or has no project access | `403 REQUESTER_FORBIDDEN` |
| Global integration credential is missing or wrong | `401 UNAUTHORIZED` |
| Requested project is inactive or missing | `503 PROJECT_UNAVAILABLE` |
| Invalid request body | `400 VALIDATION_ERROR` |

## Security note

The shared secrets make onboarding a new project simple, but a leaked secret from any connected backend could access every integration endpoint. Keep them in a backend-only secret manager, restrict deployment access, and rotate both values in Ticketing and every connected project immediately if exposure is suspected.
