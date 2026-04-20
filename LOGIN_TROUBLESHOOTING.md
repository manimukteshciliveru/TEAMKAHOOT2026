# 🔍 Login Troubleshooting Guide

## Quick Diagnosis

### Step 1: Check if servers are running

**Backend (Port 5000):**
```powershell
netstat -ano | findstr :5000
```
✅ Should show a process listening on port 5000

**Frontend (Port 5173):**
```powershell
netstat -ano | findstr :5173
```
✅ Should show a process listening on port 5173

**MongoDB (Port 27017):**
```powershell
netstat -ano | findstr :27017
```
✅ Should show a process listening on port 27017 (CONFIRMED RUNNING)

---

## Common Login Issues & Solutions

### Issue 1: "Invalid Credentials" Error

**Cause:** User doesn't exist in database OR wrong password

**Solution:**
1. **Register a new account first** - Click "Register" on login page
2. Fill in:
   - Username: `teacher1`
   - Email: `teacher@test.com`
   - Password: `password123`
3. After registration, you'll be logged in automatically
4. Select your role (Teacher/Student/Admin)

### Issue 2: Backend Not Running

**Symptoms:** 
- Can't reach login page
- Network error in browser console
- "Failed to fetch" error

**Solution:**
```powershell
# Terminal 1 - Start backend
cd c:\Users\vamsh\OneDrive\Documents\Demo_project\server
npm start
```

Look for: `Server running on port 5000` and `MongoDB Connected`

### Issue 3: Frontend Not Running

**Symptoms:**
- Page doesn't load at http://localhost:5173
- "This site can't be reached"

**Solution:**
```powershell
# Terminal 2 - Start frontend
cd c:\Users\vamsh\OneDrive\Documents\Demo_project\client
npm run dev
```

Look for: `Local: http://localhost:5173/`

### Issue 4: MongoDB Not Connected

**Symptoms:**
- Backend shows: `Error: connect ECONNREFUSED`
- Login fails with 500 error

**Solution:**
Start MongoDB:
```powershell
# If MongoDB is installed as a service
net start MongoDB

# Or start manually
mongod
```

### Issue 5: CORS Error

**Symptoms:**
- Browser console shows: "CORS policy blocked"

**Solution:**
Make sure backend is running on port 5000 and frontend on port 5173 (default ports)

### Issue 6: Role Not Set

**Symptoms:**
- Login successful but redirected to role selection

**Solution:**
This is normal! After first login:
1. Select your role (Teacher/Student/Admin)
2. Click confirm
3. You'll be redirected to your dashboard

### Issue 7: "Network Error" or "An error occurred" (On Vercel)

**Symptoms:**
- Error appears when trying to Login or Register on the live site.
- Browser console (F12) shows: `⚠️ Frontend is running in PRODUCTION but VITE_API_URL is missing!`
- Network requests show `net::ERR_CONNECTION_REFUSED` to `localhost:5000`.

**Solution:**
You need to add Environment Variables to your **Vercel Project Settings**:
1. Go to **Vercel Dashboard** > Your Project > **Settings** > **Environment Variables**.
2. Add:
   - `VITE_API_URL`: `https://YOUR-BACKEND.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://YOUR-BACKEND.onrender.com`
3. **Re-deploy** your project (or push a small change to GitHub).

---

## Testing Login Step-by-Step

### First Time User (No Account)

1. **Start both servers** (backend + frontend)
2. Go to `http://localhost:5173`
3. Click **"Register"** or **"Sign Up"**
4. Fill in details:
   ```
   Username: teacher1
   Email: teacher@test.com
   Password: password123
   ```
5. Click **Register**
6. Select role: **Teacher**
7. You should see the Teacher Dashboard

### Existing User

1. **Start both servers**
2. Go to `http://localhost:5173`
3. Click **"Login"**
4. Enter your email and password
5. Click **Login**
6. You should be redirected to your dashboard

---

## Check Browser Console for Errors

1. Open browser (Chrome/Edge/Firefox)
2. Press `F12` to open Developer Tools
3. Click **Console** tab
4. Try to login
5. Look for errors (red text)

**Common errors:**
- `Failed to fetch` → Backend not running
- `404 Not Found` → Wrong API endpoint
- `400 Bad Request` → Invalid credentials
- `500 Server Error` → Database issue

---

## Check Backend Terminal for Errors

Look at the terminal where you ran `npm start` in the server folder.

**Good output:**
```
Server running on port 5000
MongoDB Connected: localhost
```

**Bad output:**
```
Error: connect ECONNREFUSED
```
→ MongoDB not running

---

## Quick Test Accounts

After starting the app, register these test accounts:

**Teacher Account:**
- Email: `teacher@test.com`
- Password: `password123`
- Role: Teacher

**Student Account:**
- Email: `student@test.com`
- Password: `password123`
- Role: Student

---

## Still Not Working?

### Check these files exist:
- `server/.env` ✅ (exists)
- `server/node_modules` (should exist after `npm install`)
- `client/node_modules` (should exist after `npm install`)

### Reinstall dependencies:
```powershell
# Backend
cd server
rm -r node_modules
npm install

# Frontend
cd ../client
rm -r node_modules
npm install
```

### Check MongoDB:
```powershell
# Connect to MongoDB
mongosh

# List databases
show dbs

# Use your database
use ai-quiz-platform

# List users
db.users.find()
```

---

## What to Tell Me

If still not working, tell me:
1. ✅ Are both servers running? (yes/no)
2. ✅ What error message do you see? (screenshot or copy text)
3. ✅ Browser console errors? (press F12, check Console tab)
4. ✅ Backend terminal output? (copy the text)
5. ✅ Are you trying to login or register?
