# 🚀 How to Run Your Quiz Application

## ⚠️ IMPORTANT: Fix PowerShell First (One-Time Setup)

You're getting a PowerShell error because scripts are disabled. **Run this ONCE** in PowerShell as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

After running this, close and reopen your terminals.

---

## 📋 Running the Application (Every Time)

Your app has **2 parts** that must run together:

### Step 1: Start Backend Server
Open a terminal and run:
```powershell
cd c:\Users\vamsh\OneDrive\Documents\Demo_project\server
npm start
```
✅ You should see: `Server running on port 5000`

### Step 2: Start Frontend Client
Open a **NEW** terminal (keep the first one running) and run:
```powershell
cd c:\Users\vamsh\OneDrive\Documents\Demo_project\client
npm run dev
```
✅ You should see: `Local: http://localhost:5173/`

### Step 3: Open Your Browser
Go to: **http://localhost:5173**

---

## 🛑 Stopping the Application

Press `Ctrl + C` in each terminal window.

---

## 🔧 Troubleshooting

### "Scripts disabled" error
Run this in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Port already in use" error
Someone else is using the port. Kill the process:
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill it (replace PID with the number you see)
taskkill /PID <PID> /F
```

### "Module not found" error
Install dependencies:
```powershell
cd server
npm install

cd ../client
npm install
```

---

## 💡 Quick Reference

| What | Command | Port |
|------|---------|------|
| Backend | `cd server && npm start` | 5000 |
| Frontend | `cd client && npm run dev` | 5173 |
| Access App | Open browser | http://localhost:5173 |

---

## 🎯 Next Time You Want to Run

1. Open 2 terminals
2. Terminal 1: `cd server && npm start`
3. Terminal 2: `cd client && npm run dev`
4. Open browser to http://localhost:5173
5. Done! 🎉
