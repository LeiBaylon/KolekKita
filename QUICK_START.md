# 🚀 Quick Start - Push Notifications

## ⏱️ 5-Minute Setup

Follow these 3 steps to enable push notifications:

### 1️⃣ Get VAPID Key (2 minutes)

```bash
# 1. Open Firebase Console
open https://console.firebase.google.com/project/kolekkita/settings/cloudmessaging

# 2. Go to: Cloud Messaging → Web Push certificates → Generate key pair

# 3. Copy the key and update this file:
# client/src/services/pushNotificationService.js (line 14)
static VAPID_KEY = 'PASTE_YOUR_KEY_HERE';
```

### 2️⃣ Get Service Account Key (2 minutes)

```bash
# 1. Open Firebase Console
open https://console.firebase.google.com/project/kolekkita/settings/serviceaccounts/adminsdk

# 2. Click "Generate new private key" → Download

# 3. Save as serviceAccountKey.json in server/ folder
mv ~/Downloads/kolekkita-*.json server/serviceAccountKey.json

# 4. Add to .gitignore (IMPORTANT!)
echo "server/serviceAccountKey.json" >> .gitignore
```

### 3️⃣ Add Icons (1 minute)

```bash
# Create two PNG files in client/public/:
# - icon-192x192.png (192x192 pixels)
# - badge-72x72.png (72x72 pixels)

# Quick option: Copy your app logo to these names
cp path/to/your/logo.png client/public/icon-192x192.png
cp path/to/your/logo.png client/public/badge-72x72.png
```

---

## ✅ Test It

```bash
# 1. Start dev server
npm run dev

# 2. Login as admin → Go to Notifications page
# 3. Send a test notification

# 4. Login as regular user (new tab/window)
# 5. Grant notification permission when prompted
# 6. Check if you receive the notification!
```

---

## 📖 Full Documentation

- **Setup Guide:** `PUSH_NOTIFICATION_SETUP.md`
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md`

## ❓ Need Help?

Check the setup checklist on the Notifications page (visible to admins).
