import fs from "fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".interview-data");
const STORAGE_FILE = path.join(STORAGE_DIR, "interviews.json");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Initialize storage file if it doesn't exist
if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify({}), "utf8");
}

export function saveInterviewData(token, data) {
  try {
    const storage = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));

    // Merge old data + new data
    const existing = storage[token] || {};

    const updated = {
      ...existing, // keep resumeText, jdText, email, etc.
      ...data,     // update only fields passed from API
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to file
    storage[token] = updated;
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2), "utf8");
    console.log("💾 Updated interview data for token:", token);

    // Also update in memory
    global.interviewStore = global.interviewStore || {};
    global.interviewStore[token] = updated;

  } catch (error) {
    console.error("❌ Error saving interview data:", error);
  }
}

export function getInterviewData(token) {
  try {
    if (global.interviewStore && global.interviewStore[token]) {
      console.log("✅ Found interview data in memory for token:", token);
      return global.interviewStore[token];
    }

    const storage = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));

    if (storage[token]) {
      console.log("✅ Found interview data in file storage for token:", token);
      global.interviewStore = global.interviewStore || {};
      global.interviewStore[token] = storage[token];
      return storage[token];
    }

    console.warn("⚠️ No interview data found for token:", token);
    return null;

  } catch (error) {
    console.error("❌ Error reading interview data:", error);
    return null;
  }
}

export function deleteInterviewData(token) {
  try {
    const storage = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
    delete storage[token];

    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2), "utf8");

    if (global.interviewStore) delete global.interviewStore[token];

    console.log("🗑️ Deleted interview data for token:", token);

  } catch (error) {
    console.error("❌ Error deleting interview data:", error);
  }
}

export function getAllInterviews() {
  try {
    return JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
  } catch (error) {
    console.error("❌ Error reading all interviews:", error);
    return {};
  }
}
