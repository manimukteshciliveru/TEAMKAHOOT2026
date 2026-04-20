# Deployment Guide for Quiz Application

This guide outlines the steps to deploy the Quiz Application to **GitHub** (source control), **Render** (Backend), and **Vercel** (Frontend).

## Prerequisites
- A GitHub account.
- A Render account (for the backend and MongoDB).
- A Vercel account (for the frontend).
- Git installed on your machine.

---

## 1. Push Code to GitHub

First, you need to push your local code to a GitHub repository.

### Initializing Git (if not already done)
Open your terminal in the `Demo_project` root directory:

```bash
git init
git add .
git commit -m "Initial commit for deployment"
```

### Adding GitHub Remote
Go to [GitHub](https://github.com/new) and create a new repository called `quiz-app`. Then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/quiz-app.git
git branch -M main
git push -u origin main
```

---

## 2. Deploy Backend to Render

1. Log in to [Render](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name:** `quiz-backend`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Environment Variables:**
   - Click **Advanced** and add:
     - `MONGO_URI`: Your MongoDB connection string.
     - `JWT_SECRET`: A random secure string.
     - `PORT`: `5000`

---

## 3. Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New Project** and connect your GitHub repository.
3. Configure the project:
   - **Root Directory:** `client`
   - **Framework Preset:** `Vite` (automatically detected)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**
   - Add the following:
     - `VITE_API_URL`: Your Render backend URL (e.g., `https://quiz-backend.onrender.com/api`)
     - `VITE_SOCKET_URL`: Your Render backend URL (e.g., `https://quiz-backend.onrender.com`)

> [!IMPORTANT]
> **VITE_API_URL** must end with `/api`.
> **Both URLs** must start with `https://`.
> If these are missing or incorrect, you will see a "Network Error" or "An error occurred" on the live site.

> [!NOTE]
> Vercel may show a warning: *"VITE_ exposes this value to the browser"*. 
> This is **normal and expected**. These URLs need to be public so the browser can connect to your backend. You can safely click **Save**.

## 4. Verification
Once both are deployed, visit your Vercel URL. You should be able to log in, create quizzes, and host live rooms using the production URLs.
