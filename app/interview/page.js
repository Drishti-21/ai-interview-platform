"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

export default function Interview() {
  const { token } = useParams(); // read token from URL
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [rawQuestion, setRawQuestion] = useState(""); // full question text from backend
  const [displayQuestion, setDisplayQuestion] = useState(""); // typing animation text
  const [qaPairs, setQaPairs] = useState([]);
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [numQuestions, setNumQuestions] = useState(6); // default fallback
  const [currentIndex, setCurrentIndex] = useState(0); // how many questions asked

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const speakingRef = useRef(false);
  const typingTimerRef = useRef(null);

  // fetch interview metadata (cvText, jdText, numQuestions) on mount
  useEffect(() => {
    async function loadInterview() {
      if (!token) return;
      try {
        const res = await fetch(`/api/get-interview-data?token=${token}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.numQuestions) {
          setNumQuestions(Number(data.numQuestions) || 6);
        } else if (data && data.jdText) {
          // just keep default if numQuestions not present
        }
      } catch (e) {
        // ignore
      }
    }
    loadInterview();
  }, [token]);

  // Typing animation for question
  useEffect(() => {
    // reset displayed question and animate typing
    if (!rawQuestion) {
      setDisplayQuestion("");
      return;
    }
    setDisplayQuestion("");
    let i = 0;
    clearInterval(typingTimerRef.current);
    typingTimerRef.current = setInterval(() => {
      i++;
      setDisplayQuestion(rawQuestion.slice(0, i));
      if (i >= rawQuestion.length) {
        clearInterval(typingTimerRef.current);
      }
    }, 18); // typing speed
    return () => clearInterval(typingTimerRef.current);
  }, [rawQuestion]);

  // speak text (TTS) with state controls
  function speakText(text) {
    return new Promise((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 1;
        u.pitch = 1;
        u.onstart = () => {
          speakingRef.current = true;
          setIsSpeaking(true);
        };
        u.onend = () => {
          speakingRef.current = false;
          setIsSpeaking(false);
          resolve();
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (err) {
        speakingRef.current = false;
        setIsSpeaking(false);
        resolve();
      }
    });
  }

  // get next question from backend (sends token)
  async function fetchQuestion(lastAnswer = "") {
    try {
      const body = { token, lastAnswer, questionHistory: qaPairs.map((q) => q.question) };
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const q = (data && data.question) ? data.question : (lastAnswer ? "Can you tell me more about that?" : "Tell me about your most recent project.");
      setRawQuestion(q);
      return q;
    } catch (e) {
      const fallback = lastAnswer ? "Can you expand on that?" : "Tell me about your experience.";
      setRawQuestion(fallback);
      return fallback;
    }
  }

  // start speech recognition for one response (single-shot)
  function startListeningOnce() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser. Use Chrome/Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = async (evt) => {
      try {
        const transcript = evt.results[0][0].transcript;
        // push QA
        setQaPairs((prev) => {
          const next = [...prev, { question: rawQuestion, answer: transcript, ts: new Date().toISOString() }];
          setCurrentIndex(next.length);
          return next;
        });

        // if reached numQuestions, finish interview
        const afterCount = currentIndex + 1;
        if (afterCount >= numQuestions) {
          // stop recognition, finish after small delay
          recognition.stop();
          setListening(false);
          setTimeout(() => handleFinish(), 800);
          return;
        }

        // fetch next question and speak it
        const nextQ = await fetchQuestion(transcript);
        await speakText(nextQ);
        // auto-start listening again after speaking
        startListeningOnce();
      } catch (err) {
        console.error("onresult error", err);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (ev) => {
      console.warn("STT error", ev);
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn("recognition start failed", e);
      setListening(false);
    }
  }

  // handle start interview
  async function handleStart() {
    setStarted(true);
    setFinished(false);
    setQaPairs([]);
    setCurrentIndex(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      console.warn("camera permission", e);
    }

    // get first question, speak it, start listening
    const firstQ = await fetchQuestion("");
    await speakText(firstQ);
    startListeningOnce();
  }

  function handleSpeakButton() {
    if (listening) return;
    if (speakingRef.current) return;
    // start recognition manually
    startListeningOnce();
  }

  // finish interview
  function handleFinish() {
    setFinished(true);
    setStarted(false);

    // stop media
    try {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch (e) {}

    try { recognitionRef.current?.stop(); } catch (e) {}
    window.speechSynthesis.cancel();
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch (e) {}
      window.speechSynthesis.cancel();
      try {
        if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      } catch (e) {}
    };
  }, []);

  // progress fraction
  const progress = Math.min(100, Math.round(((currentIndex) / Math.max(1, numQuestions)) * 100));

  // -----------------------------
  // RENDER
  // -----------------------------
  if (!started && !finished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F3F6FF] to-[#FDF6FF] p-6">
        <div className="w-full max-w-2xl bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-2xl border border-white/50 text-center">
          <h1 className="text-4xl font-extrabold text-purple-700 mb-2">AI Interview</h1>
          <p className="text-gray-600 mb-6">This session will ask structured questions and record your answers. Please allow camera & mic.</p>

          <div className="flex items-center justify-center gap-6 mb-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg
                             ${isSpeaking ? "bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse-slow" : "bg-gradient-to-br from-purple-400 to-blue-400"}`}>
              AI
            </div>

            <div className="w-36 h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-400" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Question {currentIndex + 1} of {numQuestions}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={handleStart} className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow hover:scale-[1.02] transition">Start Interview</button>
            <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/interview/${token}`); }} className="px-6 py-3 rounded-xl bg-white border border-gray-200 shadow text-gray-700">Copy Join Link</button>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F3F6FF] to-[#FFF7F9] p-6">
        <div className="w-full max-w-3xl bg-white/90 backdrop-blur-md p-12 rounded-3xl shadow-2xl border border-white/50 text-center">
          <div className="inline-block mb-4 p-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 text-white shadow-lg text-3xl">🎉</div>
          <h2 className="text-3xl font-bold text-purple-700 mb-2">Interview Complete</h2>
          <p className="text-gray-600 mb-6">Thanks — your answers have been recorded. You may now close this window.</p>

          <div className="space-y-4 text-left">
            {qaPairs.map((p, i) => (
              <div key={i} className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
                <div className="text-sm text-purple-700 font-semibold">Q: {p.question}</div>
                <div className="mt-2 text-gray-800">A: {p.answer}</div>
                <div className="mt-2 text-xs text-gray-400">{new Date(p.ts).toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button onClick={() => location.reload()} className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold">Restart</button>
            <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/admin`); }} className="px-6 py-3 rounded-xl border">Back to Admin</button>
          </div>
        </div>
      </div>
    );
  }

  // main live UI while interview in progress
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F6F9FF] to-[#FFF7FB] p-6">
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/50">

        {/* top */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg
                             ${isSpeaking ? "bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse-slow" : "bg-gradient-to-br from-purple-400 to-blue-400"}`}>
              AI
            </div>
            <div>
              <div className="text-sm text-gray-500">Interview Progress</div>
              <div className="text-lg font-semibold text-purple-700">{currentIndex + 1} / {numQuestions}</div>
            </div>
          </div>
        </div>

        {/* center area: camera + question */}
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-full md:w-1/3 flex justify-center">
            <div className="w-48 h-48 rounded-2xl overflow-hidden border-4 border-purple-300 shadow-lg">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-gradient-to-r from-purple-50 to-white border border-purple-100 p-6 rounded-2xl shadow-sm text-purple-800 text-lg font-medium mb-4 min-h-[110px]">
              {displayQuestion || "Loading..."}
            </div>

            <div className="flex items-center gap-4">
              {/* microphone + waveform */}
              <div className="flex items-center gap-3">
                <button onClick={handleSpeakButton} disabled={listening} className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg transition ${listening ? "bg-gray-400" : "bg-green-600 hover:scale-105"}`}>
                  {listening ? "..." : "🎤"}
                </button>

                {/* waveform */}
                <div className="flex items-end h-8 gap-1">
                  {[0,1,2,3,4].map((i)=>(
                    <div key={i} className={`w-1.5 rounded-sm bg-gradient-to-b from-green-400 to-emerald-500 transition-all ${listening ? `h-${(i+2)*3}` : "h-2"}`} style={{height: listening ? `${8 + (i * 4)}px` : '6px', animation: listening ? `bounce 800ms ${i*100}ms infinite` : 'none'}} />
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-400" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-2">Question {currentIndex + 1} of {numQuestions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* bottom controls */}
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">Recorded: {qaPairs.length} answers</div>
          <div className="flex gap-3">
            <button onClick={handleFinish} className="px-4 py-2 rounded-lg bg-red-500 text-white">End Interview</button>
          </div>
        </div>
      </div>

      {/* styles: typing cursor, animations */}
      <style jsx>{`
        @keyframes bounce {
          0% { transform: scaleY(0.5); opacity: 0.6 }
          50% { transform: scaleY(1.0); opacity: 1 }
          100% { transform: scaleY(0.5); opacity: 0.6 }
        }
        .animate-pulse-slow {
          animation: pulse 2.2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.25); }
          70% { transform: scale(1.03); box-shadow: 0 0 40px 12px rgba(124, 58, 237, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
        }
      `}</style>
    </div>
  );
}
