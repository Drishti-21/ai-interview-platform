// Vercel-safe: Store data only in memory
global.interviewStore = global.interviewStore || {};

export function saveInterviewData(token, data) {
  global.interviewStore[token] = {
    ...global.interviewStore[token],
    ...data,
    updatedAt: new Date().toISOString(),
    createdAt: global.interviewStore[token]?.createdAt || new Date().toISOString(),
  };

  console.log("💾 Saved interview data:", token);
}

export function getInterviewData(token) {
  return global.interviewStore[token] || null;
}

export function deleteInterviewData(token) {
  delete global.interviewStore[token];
}

export function getAllInterviews() {
  return global.interviewStore;
}
