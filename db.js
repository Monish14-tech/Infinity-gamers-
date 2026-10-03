import { MongoClient } from "mongodb";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

function readJsonFile(filePath, defaultValue = []) {
  if (!existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed to write JSON file ${filePath}:`, err.message);
  }
}

const newsFile = path.join(dataDir, "news.json");
const sessionsFile = path.join(dataDir, "sessions.json");
const hallOfFameFile = path.join(dataDir, "hall_of_fame.json");
const enquiriesFile = path.join(dataDir, "enquiries.json");

let mongoClient = null;
let db = null;
let isMongoConnected = false;

let connectionError = null;

export async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("ℹ️ [DB] MONGODB_URI not set. Operating in local JSON file mode.");
    connectionError = "MONGODB_URI not set";
    return false;
  }

  try {
    console.log("⏳ [DB] Connecting to MongoDB Atlas...");
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    await mongoClient.connect();
    db = mongoClient.db("infinity_gamers");
    isMongoConnected = true;
    connectionError = null;
    console.log("✅ [DB] Successfully connected to MongoDB Atlas (database: infinity_gamers)");

    // Auto-seed collections if empty
    await autoSeedCollection("news", newsFile);
    await autoSeedCollection("hall_of_fame", hallOfFameFile);
    await autoSeedCollection("sessions", sessionsFile);
    await autoSeedCollection("enquiries", enquiriesFile);

    return true;
  } catch (err) {
    connectionError = err.message;
    console.error("⚠️ [DB] MongoDB Atlas connection failed:", err.message);
    console.log("ℹ️ [DB] Falling back to local JSON file mode.");
    isMongoConnected = false;
    return false;
  }
}

export function getDbStatus() {
  return {
    connected: isMongoConnected,
    type: isMongoConnected ? "mongodb" : "local-json",
    database: isMongoConnected ? "infinity_gamers" : null,
    error: connectionError
  };
}

async function autoSeedCollection(collName, jsonPath) {
  try {
    const coll = db.collection(collName);
    const count = await coll.countDocuments();
    if (count === 0 && existsSync(jsonPath)) {
      const data = readJsonFile(jsonPath, []);
      if (Array.isArray(data) && data.length > 0) {
        const cleanData = data.map(item => {
          const doc = { ...item };
          delete doc._id;
          return doc;
        });
        await coll.insertMany(cleanData);
        console.log(`🌱 [DB] Auto-seeded ${cleanData.length} records into "${collName}" from local JSON.`);
      }
    }
  } catch (err) {
    console.warn(`[DB] Error seeding ${collName}:`, err.message);
  }
}

// === NEWS ===
export async function getNews() {
  if (isMongoConnected && db) {
    return await db.collection("news").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }
  return readJsonFile(newsFile, []);
}

export async function addNews(entry) {
  if (isMongoConnected && db) {
    const doc = { ...entry };
    delete doc._id;
    await db.collection("news").insertOne(doc);
    return entry;
  }
  const news = readJsonFile(newsFile, []);
  news.unshift(entry);
  writeJsonFile(newsFile, news);
  return entry;
}

export async function deleteNews(id) {
  if (isMongoConnected && db) {
    await db.collection("news").deleteOne({ id: id });
    return true;
  }
  let news = readJsonFile(newsFile, []);
  news = news.filter(n => n.id !== id);
  writeJsonFile(newsFile, news);
  return true;
}

// === HALL OF FAME ===
export async function getHallOfFame() {
  let list = [];
  if (isMongoConnected && db) {
    list = await db.collection("hall_of_fame").find({}, { projection: { _id: 0 } }).toArray();
  } else {
    list = readJsonFile(hallOfFameFile, []);
  }
  list.forEach(p => {
    if (p.loyaltyPoints === undefined || p.loyaltyPoints === null) {
      p.loyaltyPoints = Math.round((Number(p.totalHours) || 0) * 10);
    } else {
      p.loyaltyPoints = Number(p.loyaltyPoints) || 0;
    }
  });
  list.sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));
  return list;
}

export async function addHallOfFame(entry) {
  if (isMongoConnected && db) {
    const doc = { ...entry };
    delete doc._id;
    await db.collection("hall_of_fame").insertOne(doc);
    return entry;
  }
  const hallOfFame = readJsonFile(hallOfFameFile, []);
  hallOfFame.push(entry);
  hallOfFame.sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));
  writeJsonFile(hallOfFameFile, hallOfFame);
  return entry;
}

export async function updateHallOfFame(id, updates) {
  if (isMongoConnected && db) {
    const current = await db.collection("hall_of_fame").findOne({ id: id }, { projection: { _id: 0 } });
    if (!current) return null;
    const merged = { ...current, ...updates };
    delete merged._id;
    await db.collection("hall_of_fame").updateOne({ id: id }, { $set: merged });
    return merged;
  }
  const hallOfFame = readJsonFile(hallOfFameFile, []);
  const idx = hallOfFame.findIndex(p => p.id === id);
  if (idx === -1) return null;
  hallOfFame[idx] = { ...hallOfFame[idx], ...updates };
  hallOfFame.sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));
  writeJsonFile(hallOfFameFile, hallOfFame);
  return hallOfFame[idx];
}

export async function deleteHallOfFame(id) {
  if (isMongoConnected && db) {
    await db.collection("hall_of_fame").deleteOne({ id: id });
    return true;
  }
  let hallOfFame = readJsonFile(hallOfFameFile, []);
  hallOfFame = hallOfFame.filter(p => p.id !== id);
  writeJsonFile(hallOfFameFile, hallOfFame);
  return true;
}

// === SESSIONS ===
export async function getSessions() {
  if (isMongoConnected && db) {
    return await db.collection("sessions").find({}, { projection: { _id: 0 } }).sort({ inTime: -1 }).toArray();
  }
  return readJsonFile(sessionsFile, []);
}

export async function addSession(entry) {
  if (isMongoConnected && db) {
    const doc = { ...entry };
    delete doc._id;
    await db.collection("sessions").insertOne(doc);
    return entry;
  }
  const sessions = readJsonFile(sessionsFile, []);
  sessions.unshift(entry);
  writeJsonFile(sessionsFile, sessions);
  return entry;
}

export async function updateSession(id, updatedDoc) {
  if (isMongoConnected && db) {
    const doc = { ...updatedDoc };
    delete doc._id;
    await db.collection("sessions").updateOne({ id: id }, { $set: doc });
    return doc;
  }
  const sessions = readJsonFile(sessionsFile, []);
  const idx = sessions.findIndex(s => s.id === id);
  if (idx === -1) return null;
  sessions[idx] = updatedDoc;
  writeJsonFile(sessionsFile, sessions);
  return updatedDoc;
}

export async function deleteSession(id) {
  if (isMongoConnected && db) {
    await db.collection("sessions").deleteOne({ id: id });
    return true;
  }
  let sessions = readJsonFile(sessionsFile, []);
  sessions = sessions.filter(s => s.id !== id);
  writeJsonFile(sessionsFile, sessions);
  return true;
}

// === ENQUIRIES ===
export async function getEnquiries() {
  if (isMongoConnected && db) {
    return await db.collection("enquiries").find({}, { projection: { _id: 0 } }).sort({ receivedAt: -1 }).toArray();
  }
  return readJsonFile(enquiriesFile, []);
}

export async function addEnquiry(entry) {
  if (isMongoConnected && db) {
    const doc = { ...entry };
    delete doc._id;
    await db.collection("enquiries").insertOne(doc);
    return entry;
  }
  const enquiries = readJsonFile(enquiriesFile, []);
  enquiries.push(entry);
  writeJsonFile(enquiriesFile, enquiries);
  return entry;
}
