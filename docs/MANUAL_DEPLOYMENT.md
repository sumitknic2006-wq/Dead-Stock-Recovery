# Manual Cloud Deployment Guide — StockSaathi AI
### Frontend (Vercel) + Backend (Render) + Database (MongoDB Atlas)

**Project:** StockSaathi AI — AI-Powered Dead Stock Recovery for Small Retailers  
**Tagline:** *Recover Cash. Protect Profit. Grow Smarter.*  
**Phase:** 12A — Manual Cloud Deployment Preparation

---

## 1. Architecture & Deployment Topology

```text
┌─────────────────────────────────┐           ┌──────────────────────────────────┐
│          VERCEL (SPA)           │  HTTPS    │           RENDER (API)           │
│  https://<your-app>.vercel.app  │ ────────> │ https://<your-api>.onrender.com  │
│                                 │  CORS     │                                  │
│  Root Directory: frontend       │           │  Root Directory: backend         │
│  Build: npm run build           │           │  Build: npm install              │
│  Output: dist                   │           │  Start: npm start                │
└─────────────────────────────────┘           └─────────────────┬────────────────┘
                                                                │
                                                                │ Mongoose (TLS/SSL)
                                                                ▼
                                              ┌──────────────────────────────────┐
                                              │      MONGODB ATLAS (CLUSTER)     │
                                              │   Database: stocksaathi          │
                                              │   Network: 0.0.0.0/0 (or Render) │
                                              └──────────────────────────────────┘
```

---

## 2. Prerequisites

Before starting deployment, ensure you have:
1. A **GitHub account** with this repository pushed to your personal repository.
2. A **Vercel account** ([vercel.com](https://vercel.com)) connected to your GitHub account.
3. A **Render account** ([render.com](https://render.com)) connected to your GitHub account.
4. A **MongoDB Atlas account** ([cloud.mongodb.com](https://cloud.mongodb.com)) with an active cluster.

---

## 3. Step-by-Step Deployment Order

Deploy in this specific sequence to ensure smooth configuration of dependent URLs:

```text
Step 1: Configure MongoDB Atlas (Cluster, Database User, IP Access)
  │
  ▼
Step 2: Deploy Backend on Render (Obtain Render Service URL: https://<api-name>.onrender.com)
  │
  ▼
Step 3: Deploy Frontend on Vercel (Provide VITE_API_BASE_URL=https://<api-name>.onrender.com/api)
  │
  ▼
Step 4: Update Render with Vercel Frontend URL (Add ALLOWED_ORIGINS=https://<your-app>.vercel.app)
  │
  ▼
Step 5: Run Live Verification Smoke Tests
```

---

## 4. Step 1: MongoDB Atlas Configuration

1. **Log in to MongoDB Atlas:** [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database User:**
   - Go to **Security > Database Access**.
   - Ensure an active database user exists (e.g. `stocksaathi_admin`).
   - Grant role: `Read and write to any database` (or specific database `stocksaathi`).
   - Keep note of the password (encode special characters if necessary).
3. **Network Access (IP Whitelist):**
   - Go to **Security > Network Access**.
   - Click **Add IP Address**.
   - For Render cloud hosting, Render uses dynamic outbound IPs on free/standard web services. Select **Allow Access from Anywhere (`0.0.0.0/0`)** with a descriptive comment (e.g. `Render Backend Hosting`).
4. **Get Connection String:**
   - Go to **Deployment > Database**.
   - Click **Connect > Drivers** (Node.js).
   - Copy connection string format:
     ```text
     mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/stocksaathi?retryWrites=true&w=majority
     ```
   - **Important:** Never commit this string to GitHub or put it in frontend environment variables.

---

## 5. Step 2: Backend Deployment on Render

1. **Log in to Render Dashboard:** [dashboard.render.com](https://dashboard.render.com)
2. **Create New Web Service:**
   - Click **New + > Web Service**.
   - Select **Build and deploy from a Git repository**.
   - Choose your `StockSaathi-AI` repository.
3. **Configure Service Settings:**
   - **Name:** `stocksaathi-backend` (or custom name)
   - **Region:** Closest to your users (e.g. `Singapore` for India/SE Asia, or `Frankfurt/Oregon`)
   - **Branch:** `main`
   - **Root Directory:** `backend` *(CRITICAL: do not leave empty)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (or higher tier)
4. **Add Backend Environment Variables:**
   Under **Environment Variables**, add:

   | Key | Example Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production security, cookie flags, and stack-trace suppression |
   | `PORT` | `10000` | Port automatically provided by Render |
   | `MONGODB_URI` | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/stocksaathi?retryWrites=true&w=majority` | Your Atlas connection string |
   | `JWT_SECRET` | `<generated-32-char-random-string>` | Strong random string (e.g. from `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `7d` | Token lifespan |
   | `ALLOWED_ORIGINS` | `http://localhost:5173` | Temporary until Vercel URL is created in Step 3 |

5. **Configure Health Check Path:**
   - Open **Advanced Settings**.
   - **Health Check Path:** `/api/health`
6. **Deploy:**
   - Click **Create Web Service**.
   - Wait for Render to build dependencies and launch `server.js`.
   - Verify logs display:
     ```text
     [StockSaathi AI Backend] Running in production mode on port 10000
     [Database] MongoDB connected successfully
     ```
   - Copy your Render Service URL: `https://stocksaathi-backend.onrender.com`
   - Test in your browser: `https://stocksaathi-backend.onrender.com/api/health`
     Should return:
     ```json
     {"status":"ok","message":"StockSaathi AI Backend and Database are running smoothly",...}
     ```

---

## 6. Step 3: Frontend Deployment on Vercel

1. **Log in to Vercel Dashboard:** [vercel.com](https://vercel.com)
2. **Import Project:**
   - Click **Add New... > Project**.
   - Select your `StockSaathi-AI` repository and click **Import**.
3. **Configure Project Settings:**
   - **Project Name:** `stocksaathi-ai` (or custom name)
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit**, select `frontend`, and click **Continue**. *(CRITICAL: Must point to `frontend`)*
4. **Build and Output Settings:**
   - **Build Command:** `npm run build` (overridden or default)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. **Add Frontend Environment Variables:**
   Expand **Environment Variables** and add:

   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://stocksaathi-backend.onrender.com/api` | Your Render backend URL with `/api` path |

   *(Replace `stocksaathi-backend.onrender.com` with your actual Render service domain from Step 2)*

6. **SPA Route Handling (`vercel.json`):**
   The repository already includes [`frontend/vercel.json`](file:///Users/sumitkumar/Desktop/STOCKSAATHI%20AI/StockSaathi-AI/frontend/vercel.json) with SPA rewrite rules:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/"
       }
     ]
   }
   ```
   This guarantees refreshing nested client routes serves `index.html` without 404 errors.

7. **Deploy:**
   - Click **Deploy**.
   - Wait for Vercel to finish the build.
   - Once complete, copy your production Vercel domain:
     `https://stocksaathi-ai.vercel.app`

---

## 7. Step 4: Link Frontend Origin in Render (CORS & Cookie Handshake)

Now that you have your live Vercel URL, finalize the CORS connection in Render:

1. Return to the **Render Dashboard > stocksaathi-backend > Environment**.
2. Update `ALLOWED_ORIGINS`:
   ```text
   ALLOWED_ORIGINS=https://stocksaathi-ai.vercel.app,http://localhost:5173
   ```
   *(Include any preview branches or custom domains separated by commas, without trailing slashes)*
3. Click **Save Changes**.
4. Render will automatically redeploy or restart the service within 30–60 seconds.

---

## 8. Authentication & Cookie Architecture in Production

Because the frontend (`vercel.app`) and backend (`onrender.com`) reside on different top-level domains:

1. **Dual Token Delivery:**
   - When a merchant logs in, the backend issues both:
     - A signed JWT token in the JSON response body (`data.token`).
     - A secure HttpOnly cookie (`stocksaathi_auth_token`).
2. **Bearer Token Transport:**
   - The frontend API client automatically stores the token in memory (`sessionStorage`) and transmits `Authorization: Bearer <token>` on every protected request.
   - This prevents issues on browsers with strict third-party cookie blocking (e.g. Safari ITP, Chrome Privacy Sandbox).
3. **Cross-Origin Cookie Security:**
   - In production (`NODE_ENV=production`), cookies are set with:
     - `secure: true` (only sent over HTTPS)
     - `sameSite: 'none'` (permitted in cross-domain AJAX)
     - `httpOnly: true` (inaccessible to client JavaScript)
   - Express enables `app.set('trust proxy', 1)` so Render's SSL termination proxy is trusted.

---

## 9. Live Smoke-Test Checklist

After completing deployment, verify the live application with this checklist:

- [ ] **HTTPS:** Load `https://<your-app>.vercel.app` and verify SSL padlock.
- [ ] **Auth Gateway:** Confirm unauthenticated users see the `AuthPage` (Sign In / Register Store).
- [ ] **Health Endpoint:** Open `https://<your-backend>.onrender.com/api/health` and verify `{"status": "ok", "database": {"status": "connected"}}`.
- [ ] **Registration:**
  - Switch to "Register Store" tab on Vercel frontend.
  - Register a test merchant (e.g. `test.store@example.com`, password $\ge 8$ chars).
  - Verify redirection to dashboard.
- [ ] **Tenant Scoping:**
  - Verify TopHeader displays merchant initials and business name.
  - Navigate to **Inventory** and click **Add Product** (`LIVE-TEST-01`).
  - Confirm the item is saved and displayed.
- [ ] **Logout & Session Termination:**
  - Click the **Logout** icon in TopHeader.
  - Confirm immediate redirection back to `AuthPage`.
- [ ] **Login:**
  - Log back in with the registered credentials.
  - Confirm workspace is restored with previous inventory item.
- [ ] **SPA Route Refresh:**
  - Navigate to `/inventory` or `/whatsapp-offers`.
  - Press browser Refresh (F5 / Cmd+R).
  - Verify page reloads cleanly without Vercel 404.

---

## 10. Troubleshooting Common Deployment Issues

| Issue / Error | Root Cause | Fix |
|---|---|---|
| **Vercel: 404 NOT_FOUND on page refresh** | Missing SPA rewrite rule | Ensure [`frontend/vercel.json`](file:///Users/sumitkumar/Desktop/STOCKSAATHI%20AI/StockSaathi-AI/frontend/vercel.json) exists with `{"rewrites": [{"source": "/(.*)", "destination": "/"}]}`. |
| **CORS blocked: Origin ... not permitted** | Render's `ALLOWED_ORIGINS` does not match Vercel URL | Update `ALLOWED_ORIGINS` in Render environment to match your exact Vercel URL (e.g. `https://stocksaathi-ai.vercel.app`), with no trailing slash. |
| **Backend 503: Database is not connected** | Missing or incorrect `MONGODB_URI` or Atlas IP blocked | In MongoDB Atlas, verify `0.0.0.0/0` is in Network Access, verify user password in `MONGODB_URI`, and verify `MONGODB_URI` is in Render environment variables. |
| **Vercel Build Error: Cannot find module** | Wrong Root Directory | In Vercel Project Settings, change **Root Directory** from `./` to `frontend`. |
| **Render Build Error: npm start failed** | Wrong Root Directory or missing build | In Render Settings, ensure **Root Directory** is `backend`, **Build Command** is `npm install`, and **Start Command** is `npm start`. |
| **Login fails: Network Error / Failed to fetch** | `VITE_API_BASE_URL` incorrect or points to localhost | In Vercel environment variables, set `VITE_API_BASE_URL=https://<your-backend>.onrender.com/api` and trigger a **Redeploy** on Vercel. |
| **Render Free Tier spins down (Cold Start)** | Render free instances sleep after 15 mins of inactivity | Wait 30–50 seconds for first request to wake up the service, or configure an uptime monitor (e.g. UptimeRobot) pinging `/api/health` every 10 minutes. |
