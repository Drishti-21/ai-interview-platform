// VERCEL-SAFE STORAGE (NO FILE SYSTEM)

global.interviewStore = global.interviewStore || {};

export function saveInterviewData(token, data) {
  global.interviewStore[token] = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  console.log("💾 Saved interview data in memory:", token);
}

export function getInterviewData(token) {
  if (global.interviewStore[token]) {
    console.log("✅ Loaded interview data from memory:", token);
    return global.interviewStore[token];
  }

  console.warn("⚠️ Interview data NOT found:", token);
  return null;
}

export function deleteInterviewData(token) {
  delete global.interviewStore[token];
  console.log("🗑️ Deleted interview data:", token);
}

export function getAllInterviews() {
  return global.interviewStore;
}
