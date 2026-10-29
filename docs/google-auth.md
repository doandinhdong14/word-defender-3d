# Google sign-in

The Node server handles the authorization code flow with PKCE, state and nonce.
It verifies the Google ID token (signature, issuer, audience and expiry) using
`google-auth-library`, then creates a signed 12-hour HttpOnly, SameSite=Lax cookie.
Production cookies require HTTPS and use the `__Host-` prefix. Provider tokens
and the client secret never reach the frontend. Only `openid email profile` are requested.

Set server environment variables:

```dotenv
GOOGLE_CLIENT_ID=<web application client id>
GOOGLE_CLIENT_SECRET=<client secret>
APP_URL=https://pempom.xyz
SESSION_SECRET=<at least 32 random characters, persistent across deployments>
```

In Google Auth Platform > Clients, register exactly:

```text
https://pempom.xyz/api/auth/google/callback
```

For local development, add `http://localhost:5173/api/auth/google/callback` and
set `APP_URL=http://localhost:5173` in the ignored `.env.local` file.
`npm run dev` starts Vite and the auth server together; Vite proxies auth requests.
Use Node 22.13 or newer. `npm run build && npm start` runs the production server;
production environment variables must be provided by the host.

When the consent screen is in Testing, add the Google accounts used for testing
under Audience > Test users. To allow general access, configure the external
audience and publish the consent screen in Google Auth Platform.

The OAuth client ID and secret do not authorize editing Google Cloud settings.
The redirect URI and audience must be configured by a Google Cloud project owner.

Google identities use the stable Google subject (`google:<sub>`), always start
with the player role, and never automatically link to a local password account
merely because the emails match. Existing local accounts continue to work.
Google proves identity across devices; game progress, coins and inventory are
still stored in IndexedDB on each browser. No cloud progress sync is included.

Checks: `npm test`, `npm run test:server`, `npm run test:e2e`, `npm run build`.
Server tests mock Google only inside the test process; production has no test-login route.
