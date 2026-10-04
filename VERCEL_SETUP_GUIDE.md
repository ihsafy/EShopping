# EShopping - Vercel Deployment Configuration Guide

## ⚠️ Critical Issue Fixed
Your backend was silently falling back to `localhost` MySQL on Vercel, which is unreachable. This has been fixed to fail fast with clear error messages.

## 🔧 What You Need to Do

### Step 1: Get a Remote Database
Vercel cannot connect to databases on your local machine. Choose one:

#### **Option A: TiDB Cloud (Recommended)**
- **Free tier available**
- Best for MySQL compatibility
- Steps:
  1. Go to https://tidbcloud.com
  2. Sign up (free account)
  3. Create a serverless cluster named `eshopping`
  4. Go to **Cluster Details** → **Connect**
  5. Copy the connection details

#### **Option B: PlanetScale (Simple)**
- **Free tier available**
- MySQL-compatible serverless database
- Steps:
  1. Go to https://planetscale.com
  2. Sign up (free account)
  3. Create database `eshopping`
  4. Click **Connect** → Copy credentials

#### **Option C: Railway (Easiest)**
- **Free tier available**
- One-click MySQL setup
- Steps:
  1. Go to https://railway.app
  2. Sign up (free account)
  3. New Project → **Provision PostgreSQL** (choose MySQL)
  4. Copy connection variables

---

### Step 2: Generate JWT Secret
Run this command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
**Copy the output** - you'll need it in next step.

---

### Step 3: Add Environment Variables to Vercel

1. Go to: **https://vercel.com/dashboard**
2. Select project: **EShopping**
3. Click **Settings** → **Environment Variables**

4. Add these variables one by one:

| Name | Value | Example |
|------|-------|---------|
| `DB_HOST` | Your database host | `gateway01.region.prod.aws.tidbcloud.com` |
| `DB_PORT` | Database port | `4000` (TiDB) or `3306` (others) |
| `DB_NAME` | Database name | `eshopping` |
| `DB_USER` | Database username | `your_username` |
| `DB_PASSWORD` | Database password | `your_strong_password` |
| `JWT_SECRET` | **From Step 2** | `a1b2c3d4...` (long random string) |
| `CLIENT_URL` | Your Vercel URL | `https://eshopping-phi.vercel.app` |
| `NODE_ENV` | Environment | `production` |
| `DB_SSL` | SSL enabled | `true` (for TiDB/PlanetScale) |

**Optional (for image uploads):**
| Name | Value |
|------|-------|
| `CLOUDINARY_CLOUD_NAME` | Your cloud name |
| `CLOUDINARY_API_KEY` | Your API key |
| `CLOUDINARY_API_SECRET` | Your API secret |

---

### Step 4: Redeploy

1. Go to: **https://vercel.com/dashboard/ihsafy/eshopping**
2. Click **Deployments**
3. Find the latest deployment
4. Click the **...** menu → **Redeploy**
5. Wait for build to complete (2-3 minutes)

---

### Step 5: Test the Connection

Open this URL in your browser:
```
https://eshopping-phi.vercel.app/api/health
```

**Success Response:**
```json
{
  "success": true,
  "service": "EShopping API",
  "version": "1.0.0",
  "database": "up",
  "environment": "production",
  "missingEnvVars": [],
  "timestamp": "2024-10-04T..."
}
```

**Error Response (Missing Config):**
```json
{
  "success": false,
  "message": "The EShopping API is not configured correctly...",
  "error": "Missing required environment variable: DB_HOST"
}
```

If you see an error, check:
- All variables are set in Vercel
- No typos in variable names
- Database credentials are correct
- Database is running and accessible

---

## 📝 Detailed Setup Examples

### TiDB Cloud Setup
```
DB_HOST=gateway01.us-west-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_NAME=eshopping
DB_USER=3xxxxxxxxxxx.root
DB_PASSWORD=your_password_here
DB_SSL=true
JWT_SECRET=your_generated_secret_here
CLIENT_URL=https://eshopping-phi.vercel.app
NODE_ENV=production
```

### PlanetScale Setup
```
DB_HOST=aws.connect.psdb.cloud
DB_PORT=3306
DB_NAME=eshopping
DB_USER=xxxxxxxxxxxxx
DB_PASSWORD=pscale_pw_xxxxxxxxxxxxx
DB_SSL=true
JWT_SECRET=your_generated_secret_here
CLIENT_URL=https://eshopping-phi.vercel.app
NODE_ENV=production
```

### Railway Setup
```
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=3306
DB_NAME=railway
DB_USER=root
DB_PASSWORD=your_railway_password
DB_SSL=false
JWT_SECRET=your_generated_secret_here
CLIENT_URL=https://eshopping-phi.vercel.app
NODE_ENV=production
```

---

## ✅ Verification Checklist

- [ ] Database created and running
- [ ] All environment variables added to Vercel
- [ ] JWT_SECRET is a long random string (48+ characters)
- [ ] CLIENT_URL is set to `https://eshopping-phi.vercel.app`
- [ ] Project redeployed
- [ ] `/api/health` returns `database: "up"`
- [ ] Frontend loads without "API not configured" error

---

## 🆘 Troubleshooting

### "database": "down"
- [ ] Check DB credentials are correct
- [ ] Verify database is running
- [ ] Check if host allows remote connections
- [ ] Try `DB_SSL=false` if using local/unencrypted MySQL

### Missing environment variable errors
- [ ] Verify variable names (DB_HOST not DATABASE_HOST)
- [ ] Check no leading/trailing spaces
- [ ] Redeploy after adding variables

### "This origin is not allowed" CORS error
- [ ] Make sure `CLIENT_URL=https://eshopping-phi.vercel.app`
- [ ] Don't use `localhost` or `http://` in production

### Uploads disappearing after cold start
- [ ] Set up Cloudinary (free tier available)
- [ ] Without it, images stored on Vercel's ephemeral disk will be lost

---

## 📚 Resources

- TiDB Cloud: https://tidbcloud.com
- PlanetScale: https://planetscale.com
- Railway: https://railway.app
- Cloudinary: https://cloudinary.com
- Vercel Docs: https://vercel.com/docs

---

## 🎯 Next Steps

1. Choose a database provider from options above
2. Create database and get credentials
3. Generate JWT_SECRET (step 2)
4. Add all variables to Vercel Settings
5. Redeploy
6. Test `/api/health`

Your app will work immediately after this setup! ✨
