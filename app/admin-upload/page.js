"use client";

import { useState } from "react";

export default function AdminUpload() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(e.target);

    const res = await fetch("/api/upload-pdf", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) setMessage("✨ Invite sent successfully!");
    else setMessage("❌ " + data.error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#DDE9FF] via-[#EDE5FF] to-[#FFE9F3] p-6">
      <div className="relative bg-white/70 backdrop-blur-2xl shadow-2xl p-14 rounded-3xl w-full max-w-4xl border border-white/50 animate-fadeIn">

        <h1 className="text-5xl font-extrabold text-gray-800 text-center mb-3">
          Admin Panel
        </h1>
        <p className="text-center text-lg text-gray-600 mb-10">
          Upload the candidate details to generate an AI Interview Link
        </p>

        <form onSubmit={handleUpload} className="space-y-8">

          {/* CV Upload */}
          <div>
            <label className="text-gray-700 font-semibold text-lg">
              Upload CV (PDF)
            </label>
            <input
              type="file"
              name="file"
              required
              className="mt-3 w-full p-4 rounded-2xl bg-white/90 shadow-md border border-gray-200"
            />
          </div>

          {/* Job Description */}
          <div>
            <label className="text-gray-700 font-semibold text-lg">
              Job Description
            </label>
            <textarea
              name="jd"
              rows="5"
              placeholder="Paste job description..."
              className="mt-3 w-full p-4 rounded-2xl bg-white/90 shadow-md border border-gray-200"
            ></textarea>
          </div>

          {/* Email */}
          <div>
            <label className="text-gray-700 font-semibold text-lg">
              Candidate Email
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="candidate@example.com"
              className="mt-3 w-full p-4 rounded-2xl bg-white/90 shadow-md border border-gray-200"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-xl font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500"
          >
            {loading ? "Sending Invite..." : "Send Interview Invite"}
          </button>
        </form>

        {message && (
          <div className="mt-10 text-center text-gray-800 font-semibold text-xl">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
