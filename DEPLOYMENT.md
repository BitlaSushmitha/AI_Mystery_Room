# Production deployment walkthrough

This project is configured as one Render web service: Express serves the built React app and API from the same HTTPS origin. MongoDB Atlas stores cases and sessions; Gemini generates mysteries. This avoids a separate frontend origin and production CORS setup.

## 1. Prepare the external services

### Create a Gemini API key

Create or select a project in [Google AI Studio](https://aistudio.google.com/app/apikey), then create an API key for the Gemini API. Keep it private; you will add it to Render as `GEMINI_API_KEY`. The application calls Gemini only from its server.

### Create an Atlas database

1. Create a MongoDB Atlas project and cluster.
2. In **Database Access**, create a database user with a strong password. This is separate from your Atlas website login.
3. In **Network Access**, add the outbound IP ranges used by your Render service. You can get them after creating the Render service in its **Connect → Outbound** panel. Atlas only accepts connections from entries on this access list. Avoid `0.0.0.0/0` for a public production database; Render offers dedicated outbound IPs for deployments that need narrower fixed-IP allowlisting.
4. In the Atlas cluster's **Connect → Drivers** flow, copy the Node.js connection string. Put the database name `ai-mystery-room` in the URI path and URL-encode special characters in the database username or password. Keep the URI private; it becomes `MONGODB_URI` in Render.

Atlas documentation: [connect an application](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/) and [manage the IP access list](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/).

## 2. Push the project to GitHub

Render deploys from a Git repository. Commit and push the project, including `render.yaml` and `package-lock.json`. Do not commit `.env` files. They are excluded by `.gitignore`; verify before pushing:

```powershell
git check-ignore server/.env client/.env
git status --short
```

If this folder is not already a Git repository, initialize it, create a GitHub repository, add that repository as `origin`, then push your `main` branch.

## 3. Create the Render service

1. Sign in to Render and choose **New → Blueprint**.
2. Connect the GitHub repository and select the branch to deploy.
3. Render reads [`render.yaml`](render.yaml), then asks for the two secret values. Enter `MONGODB_URI` and `GEMINI_API_KEY` in the dashboard prompt. The Blueprint generates `SESSION_SECRET` for you.
4. Create the Blueprint. Its build command is `npm ci && npm run build`; the start command is `npm start`; the health check is `/api/v1/health`.
5. Once the service exists, open **Connect → Outbound** in Render and copy its outbound CIDR ranges. Add those ranges under the Atlas project's **Network Access**. If the first deploy cannot connect to Atlas, this is expected until the allowlist is in place; redeploy after saving the Atlas rule.
6. Wait for the service to report **Live**. Render gives it an `https://<service-name>.onrender.com` URL.

Render documentation: [deploy an Express app](https://render.com/docs/deploy-node-express-app), [Blueprints](https://render.com/docs/blueprint-spec), [environment variables](https://render.com/docs/configure-environment-variables), and [health checks](https://render.com/docs/health-checks).

## 4. Check the live app

1. Open `https://<service-name>.onrender.com/api/v1/health`; expect JSON with `"status":"ok"`.
2. Open the root URL and submit a fictional scenario. This makes a live Gemini request and may consume your API quota.
3. Open a few evidence items, save notes, and refresh. The session, reviewed state, and notes should remain.
4. Submit an accusation and confirm the results reveal the saved solution.

If the health check fails, inspect the Render service logs for missing environment variables or a MongoDB connection issue. Check the Atlas IP access list and database user's credentials before changing the connection string. Do not paste secret values into issue reports or chat.

## 5. Local production preview

From the repository root, run:

```powershell
npm ci
npm run build
npm start
```

Set `NODE_ENV=production` in `server/.env` for the preview so Express serves `client/dist`. Ensure the other server variables are configured and MongoDB is reachable. The local Vite development server still proxies `/api` to `localhost:5000` and does not need `VITE_API_BASE_URL`.

## Updating the deployment

Push a commit to the connected branch; Render rebuilds and deploys it. Change production secrets in the Render dashboard, not in the repository. For a custom domain, add it in the Render service's **Settings → Custom Domains**; the client and API remain same-origin.
