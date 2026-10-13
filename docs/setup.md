# Setup and Installation Guide — StockSaathi AI

## Prerequisites
- **Node.js:** v18.0.0 or later (Tested with Node.js v24+)
- **npm:** v9.0.0 or later (Tested with npm v11+)
- **MongoDB Atlas:** Free Tier (M0) or dedicated MongoDB deployment
- **Operating System:** macOS, Linux, or Windows (WSL / PowerShell)

---

## Initial Setup

### 1. Clone or Open Workspace
Navigate to the root project directory:
```bash
cd StockSaathi-AI
```

### 2. Backend Setup
1. Move to the backend folder:
   ```bash
   cd backend
   ```
2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
   *Note on Ports: On macOS, port 5000 is occupied by default by AirPlay Receiver (ControlCenter). Use `PORT=5001` in `backend/.env` and `VITE_API_BASE_URL=http://localhost:5001/api` in `frontend/.env`.*
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the backend in development mode:
   ```bash
   npm run dev
   ```
   *(Or for standard production startup: `npm start`)*
5. Confirm operation:
   Open [http://localhost:5001/api/health](http://localhost:5001/api/health) in your browser or terminal:
   ```bash
   curl http://localhost:5001/api/health
   ```

---

## MongoDB Atlas Setup Guide (Beginner Friendly)

To connect StockSaathi AI to a persistent cloud database, follow these steps:

### Step 1: Sign Up / Sign In
1. Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create an account or sign in to your existing account.

### Step 2: Create a Database Deployment
1. Click **Create** or **Build a Database**.
2. Select the **M0 Free Cluster** (Shared).
3. Choose a cloud provider and region closest to you (e.g., AWS `ap-south-1` Mumbai).
4. Give your cluster a name (e.g., `StockSaathiCluster`) and click **Create Deployment**.

### Step 3: Create a Database User
1. Under **Security > Database Access**, click **Add New Database User**.
2. Select **Password** as the authentication method.
3. Enter a username (e.g., `stocksaathi_user`).
4. Generate or enter a secure password.
   > **Important Security Tip:** If your password contains special characters (such as `@`, `:`, `/`, `?`, `#`, or `%`), you must URL-encode them (e.g., replace `@` with `%40`, `#` with `%23`).
   > **Never share your real database password or paste it into public chats/repositories.**
5. Under Database User Privileges, select **Read and write to any database** (or built-in `atlasAdmin`).
6. Click **Add User**.

### Step 4: Configure Network Access (IP Whitelist)
1. In the Atlas dashboard, navigate to **Security > Network Access**.
2. Click **Add IP Address**.
3. To allow access only from your current network, click **Add Current IP Address**.
   *(Prefer a restricted IP allowlist over allowing all IPs `0.0.0.0/0` for production security).*
4. Click **Confirm**.

### Step 5: Obtain Connection String
1. Under **Database Deployments**, click the **Connect** button next to your cluster.
2. Choose **Drivers** (Node.js).
3. Copy the SRV connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=StockSaathiCluster
   ```

### Step 6: Configure Local Environment Variable
1. Open your local `StockSaathi-AI/backend/.env` file.
2. Set `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/stocksaathi?retryWrites=true&w=majority
   ```
   *(Replace `<username>` and `<password>` with your database user credentials, and specify `stocksaathi` as the database name).*
3. Verify that `backend/.env` is NOT tracked by Git (`git status`).

### Step 7: Restart and Verify
1. Restart your backend server (`npm run dev`).
2. Visit `http://localhost:5001/api/health`.
3. You will see:
   ```json
   {
     "status": "ok",
     "message": "StockSaathi AI Backend and Database are running smoothly",
     "database": {
       "status": "connected"
     }
   }
   ```
4. If `MONGODB_URI` is missing or invalid, the health endpoint cleanly reports `status: "degraded"` with `database: { "status": "not_configured" }` or `database: { "status": "disconnected" }` without crashing.

---

## Frontend Setup
1. Move to the frontend folder:
   ```bash
   cd StockSaathi-AI/frontend
   ```
2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
   *Contains `VITE_API_BASE_URL=http://localhost:5001/api`.*
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
5. Open your browser: [http://localhost:5173](http://localhost:5173).

---

## Production Build Verification
```bash
cd StockSaathi-AI/frontend
npm run build
```
Static assets will be compiled to `frontend/dist/`.
