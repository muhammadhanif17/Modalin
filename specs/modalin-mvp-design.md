# Modalin MVP Design

## Acceptance criteria

- A visitor can open the web app and browse seeded opportunities.
- A user can register and log in as UMKM or investor.
- Authenticated users can read and update their profile.
- UMKM users can publish a funding request.
- Users can search active funding requests.
- Access to private resources is checked on the API by token subject and role.
- Local development works with Docker MySQL and the documented commands.

## Architecture

The Vite React application calls the Express API over HTTP. Express validates payloads with Zod, verifies JWTs, applies role and ownership checks, and accesses MySQL through Prisma. The browser never accesses MySQL directly. Vercel hosts the static web build; a Docker-capable host runs the API; production MySQL is managed separately.

## Security decisions

- Passwords use Argon2id hashing.
- JWT verification allowlists HS256, issuer, audience, and expiry.
- Auth endpoints are rate limited.
- API payloads are validated on the server and forms validate basic constraints on the client.
- Responses select fields explicitly and never return password hashes.
- CORS uses one configured web origin.
- Funding request reads expose only published records.

## Delivery order

1. Local database, seed data, auth, profiles, and funding requests.
2. Discovery UI and authenticated dashboard.
3. Connection, chat, agreement, and rating modules.
4. Automated tests, migrations, security review, and hosting configuration.
