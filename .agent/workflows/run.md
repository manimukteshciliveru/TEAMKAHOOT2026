---
description: How to run the Quiz Application (Frontend + Backend)
---

# Running the Quiz Application

This application has two parts that need to run simultaneously:
1. **Backend Server** (Node.js/Express on port 5000)
2. **Frontend Client** (React/Vite on port 5173)

## Prerequisites

Make sure you have:
- Node.js installed (v14 or higher)
- MongoDB running locally or connection string in `.env`

## Option 1: Using Two Terminals (Recommended)

### Terminal 1 - Backend Server
```powershell
cd server
npm start
```
The backend will start on `http://localhost:5000`

### Terminal 2 - Frontend Client
```powershell
cd client
npm run dev
```
The frontend will start on `http://localhost:5173`

## Option 2: Using Docker (If Available)

```powershell
docker-compose up
```

## Accessing the Application

Once both servers are running:
1. Open your browser
2. Go to `http://localhost:5173`
3. You should see the login page

## Stopping the Application

- Press `Ctrl + C` in each terminal to stop the servers
- Or if using Docker: `docker-compose down`

## Troubleshooting

### PowerShell Execution Policy Error
If you get "running scripts is disabled", run this in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use
If port 5000 or 5173 is already in use:
- Find and kill the process using that port
- Or change the port in the configuration files

### Dependencies Not Installed
If you get module errors, install dependencies:
```powershell
# In server directory
cd server
npm install

# In client directory
cd client
npm install
```

## Quick Start Commands

**First time setup:**
```powershell
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

**Every time you want to run:**
```powershell
# Terminal 1
cd server
npm start

# Terminal 2 (new terminal)
cd client
npm run dev
```
