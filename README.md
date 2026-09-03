# Modalin

Modalin is a web platform that connects Indonesian UMKM with relevant investors. The repository contains a Vercel-ready React frontend and a Docker-ready Express API.

## Local development

1. Copy `.env.example` to `.env` and set a JWT secret of at least 32 characters.
2. Run `docker compose up -d db`.
3. Run `npm install`.
4. Run `npm --workspace apps/api run db:generate`, `npm --workspace apps/api run db:push`, and `npm --workspace apps/api run db:seed`.
5. Start the API with `npm run dev:api` and web with `npm run dev:web`.

Demo accounts after seeding:

- UMKM: `umkm@modalin.local` / `modalin-demo-2026`
- Investor: `investor@modalin.local` / `modalin-demo-2026`

The frontend can be deployed to Vercel with the repository root as the project root. Set `VITE_API_URL` to the public API URL in Vercel project environment variables. The API is intended for a Docker-capable host such as Render, Railway, Fly.io, Cloud Run, or a VPS. `render.yaml` is included as a deployment starting point. MySQL should be provided by a managed database in production rather than a container volume.

## Production deployment

1. Create a managed MySQL database and copy its connection string into `DATABASE_URL`.
2. Deploy `apps/api/Dockerfile` to a Docker-capable service. Set `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `WEB_ORIGIN`, `DATABASE_URL`, and `API_PORT=4000` as secrets/environment variables.
3. Run `npm --workspace apps/api run db:push` once against the production database, or create and run a reviewed Prisma migration before the first release.
4. Confirm `GET https://api.example.com/health` returns `{ "status": "ok" }`.
5. Create a Vercel project from the repository root. Set `VITE_API_URL=https://api.example.com`, then deploy using the checked-in `vercel.json`.
6. Replace `WEB_ORIGIN` with the final Vercel domain and redeploy/restart the API.

The current repository is deployment-ready but cannot be deployed to an external account without the owner's Vercel, API-host, domain, and managed-MySQL credentials.

## Security

Never commit `.env` files. The API validates input with Zod, hashes passwords with Argon2, uses Helmet, rate-limits authentication, restricts CORS, and scopes responses to authenticated users. Run the `pentester` agent only against systems you own or have written authorization to test.
