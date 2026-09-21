# 📱 FitPulse Gym Log (Mobile PWA)

A minimalist, high-contrast, offline-first Progressive Web App designed for frictionless **one-thumb logging** at the gym, with bidirectional **Push & Pull** integration with your AI assistant (Antigravity).

---

## ⚡ Quick Start

### 1. Run Locally (Testing on Laptop or Local Network)
```bash
cd mobile
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser.

To access it on your phone on the same Wi-Fi:
Find your machine's local IP (`ip addr` or `ifconfig`) and open `http://<YOUR_IP>:3000` on your phone.

---

## ☁️ Deploy to Vercel (Cloud Access at the Gym)

To access the app from gym cellular/Wi-Fi without running a local server:

1. Push your repository to GitHub.
2. Import the `FitnessTracker/mobile` folder into [Vercel](https://vercel.com).
3. **Database (Turso free cloud SQLite):**
   - Create a free database at [turso.tech](https://turso.tech):
     ```bash
     turso db create fitpulse
     turso db show fitpulse --url
     turso db tokens create fitpulse
     ```
   - In Vercel Project Settings -> **Environment Variables**, add:
     - `TURSO_DATABASE_URL` = `libsql://your-db.turso.io`
     - `TURSO_AUTH_TOKEN` = `your-turso-token`
     - *(Optional)* `API_SECRET` = `your-chosen-secret-passphrase`
4. Set the local CLI environment variable:
   ```bash
   export WORKOUT_APP_URL="https://your-app.vercel.app"
   export API_SECRET="your-chosen-secret-passphrase"
   ```

---

## 📲 Installing on Your Phone (PWA)

1. Open your deployed URL (`https://your-app.vercel.app`) in **Safari** (iOS) or **Chrome** (Android).
2. Tap the **Share** button (iOS) or **Three Dots** menu (Android).
3. Tap **"Add to Home Screen"**.
4. The app will launch fullscreen with zero browser address bars, just like a native app.

---

## 🤖 Antigravity AI Push & Pull Workflow

You can interact with the app directly through Antigravity!

### 1. Push a Planned Workout Routine
Ask Antigravity:
> *"Plan a heavy chest and tricep workout and push it to my phone app."*

Or run the CLI script directly:
```bash
python3 scripts/workout_sync.py push --file scripts/sample_push_day.json
```

### 2. Log at the Gym (Phone)
- Open the app on your phone.
- Tap `+` / `-` or enter weights and reps.
- Tap the checkmark button when each set is done (this automatically triggers the 90s rest timer with audio beep and vibration).
- Tap **"Finish Workout"** when done. (Works 100% offline if gym signal drops, then auto-syncs when online).

### 3. Pull Results & Progression
When you get back to your computer, ask Antigravity:
> *"Pull today's workout results and tell me how my volume and progressive overload looked."*

Or run the CLI script directly:
```bash
python3 scripts/workout_sync.py pull
```

---

## 📁 API Endpoints

- `POST /api/workout/push` — Queues a planned workout routine (accepts optional Bearer token).
- `GET  /api/workout/today` — Fetches today's active or queued routine for the phone.
- `POST /api/workout/save` — Saves completed sets, weights, reps, and finishes workout.
- `GET  /api/workout/pull` — Pulls completed workout analytics (volume, max weight, estimated 1RM).
