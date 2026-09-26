# INFINITY GAMERS — PS5 Gaming Lounge

A high-performance, dark-aesthetic web application and live station management dashboard for **Infinity Gamers**, located at Thoppampatti Pirivu, Coimbatore.

---

## Features
- **Modern Dark UI**: Engineered with custom responsive CSS, glassmorphism, and clean typography.
- **PS5 Arcade Showcase**: Interactive game catalog featuring top titles (FC26, WWE 2K26, Mortal Kombat 1, GTA V, God of War, Spider-Man 2, and more).
- **Interactive Visit & Map**: Google Maps embed formatted to fit all screen sizes with venue landmark notes and direct call actions.
- **News & Community Hub**: Live player highlights, tournament announcements, and community leaderboards.
- **Admin Command Center**: Real-time session management, revenue tracking, player records, and quick actions (`/admin.html`).
- **Zero-Dependency Native Backend**: Built on Node.js native `node:http` and `node:fs` without heavy external packages.

---

## Getting Started

### Prerequisites
- Node.js 18.0.0 or newer

### Local Development
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 1-Click Cloud Deployment (Render.com)

1. Sign in to [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `https://github.com/Monish14-tech/Infinity-gamers-.git`.
4. Configure the service:
   - **Environment**: `Node`
   - **Build Command**: *(leave empty)*
   - **Start Command**: `npm start`
   - **Plan**: Free
5. (Optional) Set Environment Variables:
   - `ADMIN_USER`: `admin`
   - `ADMIN_PASS`: *(your desired admin password)*
6. Click **Deploy Web Service**. Render will provision an SSL URL (e.g. `https://infinity-gamers.onrender.com`).
