import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let port = Number(process.env.PORT) || 3000;
const dataDir = path.join(__dirname, "data");
const enquiriesFile = path.join(dataDir, "enquiries.json");
const sessionsFile = path.join(dataDir, "sessions.json");
const newsFile = path.join(dataDir, "news.json");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// ADMIN CREDENTIALS (Can be configured via environment variables)
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "infinity2026";
const ADMIN_TOKEN = "ig_auth_" + Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString("base64");

const venueInfo = {
  name: "INFINITY GAMERS",
  tagline: "PLAY BEYOND LIMITS",
  experience: "PS5 GAMING LOUNGE",
  location: "THOPPAMPATTI PIRIVU, CBE - 17, PINCODE - 641017",
  landmark: "Opposite HDFC Bank",
  timings: "10:00 AM TO 09:30 PM",
  phone: "99944 20447",
  social: "@infinitygamers_cbe",
  capacity: "2 PS5 Consoles • Up to 4 Players Per Console",
  features: ["Air Conditioned Lounge", "4K 120Hz Displays", "DualSense Haptics", "Pre-booking Recommended", "Walk-ins Welcome"],
  games: ["FC26", "WWE 2K26", "MORTAL KOMBAT 1", "GTA V", "007 FIRST LIGHT", "SPIDER-MAN 2", "RDR2", "GOD OF WAR", "IT TAKES TWO", "A WAY OUT", "OVERCOOKED"]
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4"
};

// DATA ACCESS HELPERS
function readJson(filePath, defaultValue = []) {
  if (!existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function send(response, statusCode, data, isJson = true) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Content-Type": isJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"
  });
  response.end(isJson ? JSON.stringify(data) : data);
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function body(request) {
  return new Promise((resolve, reject) => {
    let payload = "";
    request.on("data", chunk => { payload += chunk; });
    request.on("end", () => {
      if (!payload || !payload.trim()) return resolve({});
      try {
        resolve(JSON.parse(payload));
      } catch {
        try {
          const params = new URLSearchParams(payload);
          const obj = {};
          for (const [k, v] of params.entries()) {
            obj[k] = v;
          }
          resolve(obj);
        } catch (err) {
          reject(err);
        }
      }
    });
    request.on("error", reject);
  });
}

function checkAdminAuth(request) {
  const authHeader = request.headers["authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  return token === ADMIN_TOKEN;
}

// COMPUTE TOP PLAYERS FROM SESSIONS
function calculateTopPlayers(sessions) {
  const playerMap = new Map();

  sessions.forEach(sess => {
    const key = sess.phone ? sess.phone.trim() : sess.customerName.trim().toLowerCase();
    if (!key) return;

    // Calculate duration
    let duration = Number(sess.durationMinutes) || 0;
    if (!duration && sess.inTime && sess.outTime) {
      const inDate = new Date(sess.inTime).getTime();
      const outDate = new Date(sess.outTime).getTime();
      if (!isNaN(inDate) && !isNaN(outDate) && outDate > inDate) {
        duration = Math.round((outDate - inDate) / (1000 * 60));
      }
    }

    if (!playerMap.has(key)) {
      playerMap.set(key, {
        customerName: sess.customerName,
        phone: sess.phone || "-",
        totalMinutes: 0,
        totalHours: 0,
        sessionCount: 0,
        totalSpent: 0,
        favoriteGame: sess.game || "EA Sports FC 26",
        lastPlayed: sess.outTime || sess.inTime || new Date().toISOString()
      });
    }

    const player = playerMap.get(key);
    player.totalMinutes += duration;
    player.totalHours = Number((player.totalMinutes / 60).toFixed(1));
    player.sessionCount += 1;
    player.totalSpent += Number(sess.amount) || 0;
    if (sess.game) player.favoriteGame = sess.game;
    if (sess.outTime || sess.inTime) player.lastPlayed = sess.outTime || sess.inTime;
  });

  const list = Array.from(playerMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);

  // Assign ranks & badges
  return list.map((p, idx) => {
    let tier = "ROOKIE";
    if (p.totalHours >= 15) tier = "DIAMOND SQUAD";
    else if (p.totalHours >= 8) tier = "PLATINUM";
    else if (p.totalHours >= 3) tier = "GOLD";

    return {
      rank: idx + 1,
      ...p,
      tier
    };
  });
}

const server = createServer(async (request, response) => {
  const startedAt = Date.now();
  const url = new URL(request.url, `http://${request.headers.host}`);
  response.on("finish", () => console.log(`${request.method} ${url.pathname} ${response.statusCode} ${Date.now() - startedAt}ms`));

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    return response.end();
  }

  // REDIRECTS FOR LEGACY / CLEAN URLS
  if (url.pathname === "/admin" || url.pathname === "/admin.html") return redirect(response, "/index.html");
  if (url.pathname === "/games" || url.pathname === "/games.html") return redirect(response, "/arcade.html");
  if (url.pathname === "/booking" || url.pathname === "/booking.html") return redirect(response, "/visit.html");
  if (url.pathname === "/bookings" || url.pathname === "/bookings.html") return redirect(response, "/index.html");
  if (url.pathname === "/offers" || url.pathname === "/offers.html") return redirect(response, "/index.html#offers");
  if (url.pathname === "/visit-us" || url.pathname === "/visit-us.html") return redirect(response, "/visit.html");

  // ========================================================
  // PUBLIC APIS
  // ========================================================
  if (request.method === "GET" && url.pathname === "/api/health") {
    return send(response, 200, { status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  }

  if (request.method === "GET" && url.pathname === "/api/info") {
    return send(response, 200, venueInfo);
  }

  // PUBLIC NEWS FEED
  if (request.method === "GET" && url.pathname === "/api/news") {
    const news = readJson(newsFile, []);
    return send(response, 200, news);
  }

  // PUBLIC TOP PLAYERS LEADERBOARD
  if (request.method === "GET" && url.pathname === "/api/top-players") {
    const sessions = readJson(sessionsFile, []);
    const topPlayers = calculateTopPlayers(sessions);
    return send(response, 200, topPlayers.slice(0, 10));
  }

  // CONTACT ENQUIRY SUBMISSION
  if (request.method === "POST" && url.pathname === "/api/enquiry") {
    try {
      const data = await body(request);
      const enquiries = readJson(enquiriesFile, []);
      const entry = {
        id: Date.now(),
        name: data.name || "Anonymous",
        phone: data.phone || "",
        players: data.players || "1",
        msg: data.msg || "",
        receivedAt: new Date().toISOString()
      };
      enquiries.push(entry);
      writeJson(enquiriesFile, enquiries);
      return send(response, 201, { success: true, message: "Enquiry saved", enquiry: entry });
    } catch {
      return send(response, 400, { error: "Failed to process enquiry." });
    }
  }

  // ========================================================
  // ADMIN APIS
  // ========================================================

  // ADMIN LOGIN
  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    try {
      const { username, password } = await body(request);
      if (username === ADMIN_USER && password === ADMIN_PASS) {
        return send(response, 200, {
          success: true,
          token: ADMIN_TOKEN,
          user: { username: ADMIN_USER, role: "owner" }
        });
      }
      return send(response, 401, { success: false, error: "Invalid admin username or password." });
    } catch {
      return send(response, 400, { success: false, error: "Malformed login request." });
    }
  }

  // ADMIN SESSIONS (CUSTOMER IN/OUT TRACKER)
  if (url.pathname === "/api/admin/sessions") {
    if (!checkAdminAuth(request)) return send(response, 401, { error: "Unauthorized. Admin login required." });

    if (request.method === "GET") {
      const sessions = readJson(sessionsFile, []);
      return send(response, 200, sessions);
    }

    if (request.method === "POST") {
      try {
        const payload = await body(request);
        const sessions = readJson(sessionsFile, []);

        const inTime = payload.inTime ? new Date(payload.inTime).toISOString() : new Date().toISOString();
        const outTime = payload.outTime ? new Date(payload.outTime).toISOString() : "";
        const station = (payload.station || "PS5 Station 1").trim();
        const status = outTime ? "completed" : (payload.status || "active");

        // STATION LOCK ENFORCEMENT
        // If creating an active session, ensure this station is NOT already locked by another active session
        if (status === "active") {
          const activeExisting = sessions.find(s => s.station === station && s.status === "active");
          if (activeExisting) {
            return send(response, 400, {
              error: `${station} is currently locked! Active player "${activeExisting.customerName}" is currently playing. Please checkout or end that session first.`
            });
          }
        }

        let durationMinutes = Number(payload.durationMinutes) || 0;

        if (!durationMinutes && inTime && outTime) {
          const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
          if (diffMs > 0) durationMinutes = Math.round(diffMs / 60000);
        }

        const newSession = {
          id: "sess_" + Date.now(),
          customerName: (payload.customerName || "Customer").trim(),
          phone: (payload.phone || "").trim(),
          station,
          inTime,
          outTime,
          status,
          durationMinutes,
          amount: Number(payload.amount) || 150,
          game: payload.game || "EA Sports FC 26",
          notes: payload.notes || ""
        };

        sessions.unshift(newSession);
        writeJson(sessionsFile, sessions);
        return send(response, 201, { success: true, session: newSession });
      } catch (err) {
        return send(response, 400, { error: "Failed to record session: " + err.message });
      }
    }
  }

  // UPDATE SESSION (CHECKOUT / END SESSION)
  if (request.method === "PATCH" && url.pathname.startsWith("/api/admin/sessions/")) {
    if (!checkAdminAuth(request)) return send(response, 401, { error: "Unauthorized." });

    const id = url.pathname.replace("/api/admin/sessions/", "");
    try {
      const updates = await body(request);
      const sessions = readJson(sessionsFile, []);
      const index = sessions.findIndex(s => s.id === id);

      if (index === -1) return send(response, 404, { error: "Session record not found." });

      const current = sessions[index];
      const outTime = updates.outTime ? new Date(updates.outTime).toISOString() : new Date().toISOString();
      const inTime = current.inTime;
      let durationMinutes = Number(updates.durationMinutes) || 0;

      if (!durationMinutes && inTime && outTime) {
        const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
        if (diffMs > 0) durationMinutes = Math.round(diffMs / 60000);
      }

      sessions[index] = {
        ...current,
        ...updates,
        outTime,
        durationMinutes,
        status: "completed"
      };

      writeJson(sessionsFile, sessions);
      return send(response, 200, { success: true, session: sessions[index] });
    } catch (err) {
      return send(response, 400, { error: "Failed to update session: " + err.message });
    }
  }

  // DELETE SESSION
  if (request.method === "DELETE" && url.pathname.startsWith("/api/admin/sessions/")) {
    if (!checkAdminAuth(request)) return send(response, 401, { error: "Unauthorized." });

    const id = url.pathname.replace("/api/admin/sessions/", "");
    let sessions = readJson(sessionsFile, []);
    sessions = sessions.filter(s => s.id !== id);
    writeJson(sessionsFile, sessions);
    return send(response, 200, { success: true, message: "Session record removed." });
  }

  // ADMIN NEWS MANAGEMENT (CREATE / DELETE)
  if (url.pathname === "/api/admin/news") {
    if (!checkAdminAuth(request)) return send(response, 401, { error: "Unauthorized." });

    if (request.method === "POST") {
      try {
        const payload = await body(request);
        const news = readJson(newsFile, []);
        const entry = {
          id: "news_" + Date.now(),
          title: payload.title || "Announcement",
          category: (payload.category || "ANNOUNCEMENT").toUpperCase(),
          date: payload.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
          badge: payload.badge || "UPDATE",
          summary: payload.summary || "",
          prize: payload.prize || "",
          entryFee: payload.entryFee || "",
          time: payload.time || "ALL DAY",
          featured: Boolean(payload.featured)
        };
        news.unshift(entry);
        writeJson(newsFile, news);
        return send(response, 201, { success: true, news: entry });
      } catch (err) {
        return send(response, 400, { error: "Failed to post news: " + err.message });
      }
    }
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/admin/news/")) {
    if (!checkAdminAuth(request)) return send(response, 401, { error: "Unauthorized." });

    const id = url.pathname.replace("/api/admin/news/", "");
    let news = readJson(newsFile, []);
    news = news.filter(n => n.id !== id);
    writeJson(newsFile, news);
    return send(response, 200, { success: true, message: "News item deleted." });
  }

  // ========================================================
  // STATIC FILE SERVING
  // ========================================================
  if (request.method === "GET") {
    let cleanPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    
    // Check if clean URL without extension maps to an .html file
    if (!path.extname(cleanPath)) {
      const htmlCandidate = path.resolve(__dirname, `.${cleanPath}.html`);
      if (existsSync(htmlCandidate) && statSync(htmlCandidate).isFile()) {
        cleanPath = `${cleanPath}.html`;
      }
    }

    const filePath = path.resolve(__dirname, `.${cleanPath}`);
    if (!filePath.startsWith(path.resolve(__dirname)) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      return redirect(response, "/index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const isDynamicAsset = ext === ".html" || ext === ".css" || ext === ".js";
    const headers = {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": isDynamicAsset ? "no-store, no-cache, must-revalidate, max-age=0" : "max-age=3600"
    };
    if (isDynamicAsset) {
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
    }
    response.writeHead(200, headers);
    return response.end(readFileSync(filePath));
  }

  response.writeHead(405, { Allow: "GET, POST, PATCH, DELETE, OPTIONS" });
  response.end();
});

server.on("error", error => {
  if (error.code !== "EADDRINUSE") throw error;
  port += 1;
  server.listen(port, "0.0.0.0");
});

const host = process.env.HOST || "0.0.0.0";
server.listen(port, host, () => console.log(`Infinity Gamers server running at http://${host}:${port}`));
