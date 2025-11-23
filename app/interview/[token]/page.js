"use client";
import { use, useEffect, useRef, useState } from "react";

export default function InterviewPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const token = params.token;

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewOver, setInterviewOver] = useState(false);
  // Removed time limit
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [thinkingTime, setThinkingTime] = useState(15);
  const [isThinking, setIsThinking] = useState(false);
  const [speakingTime, setSpeakingTime] = useState(0);
  const [maxSpeakingTime, setMaxSpeakingTime] = useState(60);
  const [error, setError] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentTopicCount, setCurrentTopicCount] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [jdText, setJdText] = useState("");

  // Refs
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const thinkingTimerRef = useRef(null);
  const speakingTimerRef = useRef(null);
  const autoSubmitTimerRef = useRef(null);
  const isManualStopRef = useRef(false);
  const accumulatedTranscriptRef = useRef("");

  // Fetch interview metadata (cv, jd)
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/get-interview-data?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Interview not found" }));
          setError(err.error || "Interview not found");
          return;
        }
        const data = await res.json();
        setJdText(data.jdText || "");
      } catch (e) {
        console.error("Could not fetch interview data:", e);
        setError("Could not fetch interview data");
      }
    }
    if (token) fetchData();
  }, [token]);

  // Camera setup
  useEffect(() => {
    if (interviewStarted) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }).catch((err) => {
        console.warn("Camera/mic permission error:", err);
      });
    }
  }, [interviewStarted]);

  function speak(text) {
    if (!text || text.trim() === "") {
      console.warn("No text to speak");
      return;
    }
    
    // stop any STT to avoid conflicts
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    isManualStopRef.current = false;
    accumulatedTranscriptRef.current = "";

    if (speakingTimerRef.current) { clearInterval(speakingTimerRef.current); speakingTimerRef.current = null; }
    if (autoSubmitTimerRef.current) { clearTimeout(autoSubmitTimerRef.current); autoSubmitTimerRef.current = null; }

    // Cancel any ongoing speech and wait for it to clear
    window.speechSynthesis.cancel();
    
    // Wait a bit for cancellation to complete
    setTimeout(() => {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        console.log("Started speaking:", text.substring(0, 50) + "...");
      };
      
      utterance.onend = () => {
        console.log("Finished speaking");
        setIsSpeaking(false);
        startThinkingTimer();
      };
      
      utterance.onerror = (event) => {
        if (event.error === "interrupted") {
          console.log("Speech was interrupted (likely intentional)");
        } else {
          console.error("Speech error:", event.error);
        }
        setIsSpeaking(false);
        // Only start thinking timer if it wasn't an intentional interruption
        if (event.error !== "interrupted") {
          startThinkingTimer();
        }
      };
      
      // Double check that synthesis is available before speaking
      if (window.speechSynthesis) {
        window.speechSynthesis.speak(utterance);
      } else {
        console.error("Speech synthesis not available");
        setIsSpeaking(false);
        startThinkingTimer();
      }
    }, 100);
  }

  function startThinkingTimer() {
    setIsThinking(true);
    setThinkingTime(15);
    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    thinkingTimerRef.current = setInterval(() => {
      setThinkingTime((prev) => {
        if (prev <= 1) {
          clearInterval(thinkingTimerRef.current);
          thinkingTimerRef.current = null;
          setIsThinking(false);
          startListening();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function calculateSpeakingTime(q) {
    const words = (q || "").trim().split(/\s+/).filter(Boolean).length;
    const calculated = 60 + Math.floor(words / 10) * 10;
    return Math.min(Math.max(calculated, 20), 120);
  }

  function correctTechnicalTerms(text) {
    if (!text) return text;
    const corrections = {
      'doctor': 'docker',
      'doctors': 'docker',
      'darker': 'docker',
      'coober netties': 'kubernetes',
      'cooper netties': 'kubernetes',
      'my sequel': 'mysql',
      'post gray': 'postgresql',
      'red is': 'redis',
    };
    let out = text;
    for (const [k,v] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${k}\\b`, 'gi');
      out = out.replace(regex, (m) => m[0] === m[0].toUpperCase() ? v.charAt(0).toUpperCase()+v.slice(1): v);
    }
    return out;
  }

  function chooseBestAlternative(alternatives) {
    if (!alternatives || alternatives.length === 0) return "";
    if (alternatives.length === 1) return alternatives[0].transcript;
    let bestScore = -1; let best = alternatives[0].transcript;
    alternatives.forEach(alt => {
      let score = alt.confidence || 0.5;
      const t = alt.transcript.toLowerCase();
      const keywords = ['docker','kubernetes','python','javascript','react','node','api','database','cloud','aws','git'];
      if (keywords.some(k=>t.includes(k))) score += 0.1;
      if (t.split(/\s+/).length > 3) score += 0.05;
      if (score > bestScore) { bestScore = score; best = alt.transcript; }
    });
    return best;
  }

  function startListening() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    if (thinkingTimerRef.current) { clearInterval(thinkingTimerRef.current); setIsThinking(false); thinkingTimerRef.current = null; }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;

    const maxTime = calculateSpeakingTime(question);
    setMaxSpeakingTime(maxTime);
    setSpeakingTime(0);
    setCurrentTranscript("");
    accumulatedTranscriptRef.current = "";

    recognition.onstart = () => {
      setIsListening(true);
      isManualStopRef.current = false;
      if (!speakingTimerRef.current) {
        speakingTimerRef.current = setInterval(()=> setSpeakingTime(prev=>prev+1), 1000);
      }
      if (!autoSubmitTimerRef.current) {
        autoSubmitTimerRef.current = setTimeout(()=> {
          isManualStopRef.current = true;
          if (recognitionRef.current) recognitionRef.current.stop();
        }, maxTime * 1000);
      }
    };

    recognition.onend = () => {
      console.log("Recognition ended, manual stop:", isManualStopRef.current);
      
      // If not manual stop and still should be listening, restart
      if (!isManualStopRef.current && isListening) {
        setTimeout(() => { 
          if (recognitionRef.current && !isManualStopRef.current && isListening) {
            try { 
              recognitionRef.current.start(); 
            } catch(e) {
              console.log("Could not restart recognition:", e);
            }
          }
        }, 100);
        return;
      }
      
      // Manual stop or intended end
      setIsListening(false);
      if (speakingTimerRef.current) { 
        clearInterval(speakingTimerRef.current); 
        speakingTimerRef.current = null; 
      }
      if (autoSubmitTimerRef.current) { 
        clearTimeout(autoSubmitTimerRef.current); 
        autoSubmitTimerRef.current = null; 
      }

      const finalTranscript = accumulatedTranscriptRef.current.trim();
      console.log("Final transcript:", finalTranscript);
      
      if (finalTranscript) {
        const corrected = correctTechnicalTerms(finalTranscript);
        submitAnswer(corrected);
      } else {
        submitAnswer("(No answer provided)");
      }
    };

    recognition.onresult = (event) => {
      let complete = "";
      for (let i=0;i<event.results.length;i++) {
        const r = event.results[i];
        if (r.isFinal) {
          const alts = [];
          for (let j=0;j<r.length;j++) alts.push(r[j]);
          const best = chooseBestAlternative(alts);
          complete += best + " ";
          if (alts.length > 1) {
            console.log("Alternatives:", alts.map(a=>a.transcript));
            console.log("Selected:", best);
          }
        }
      }
      if (complete) {
        const corrected = correctTechnicalTerms(complete.trim());
        accumulatedTranscriptRef.current = corrected;
        setCurrentTranscript(corrected);
      }
    };

    recognition.onerror = (e) => {
      console.log("Speech recognition error:", e.error);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  async function manualSubmit() {
    isManualStopRef.current = true;
    if (recognitionRef.current) recognitionRef.current.stop();
    if (speakingTimerRef.current) clearInterval(speakingTimerRef.current);
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    setIsListening(false);
  }

  async function submitAnswer(userAnswer) {
    console.log("=== SUBMITTING ANSWER ===");
    console.log("User Answer:", userAnswer);
    console.log("Current Question:", question);
    console.log("Current Answers Count:", answers.length);
    
    // Prevent multiple submissions
    if (!question || question.trim() === "") {
      console.log("No question to answer, skipping submission");
      return;
    }
    
    const newAnswer = { question, answer: userAnswer };
    const updatedAnswers = [...answers, newAnswer];
    
    // Update answers state
    setAnswers(updatedAnswers);
    console.log("Updated Answers Array:", updatedAnswers);
    
    // Clear current question to prevent reuse
    setQuestion("");
    
    // Reset UI state
    setSpeakingTime(0);
    setMaxSpeakingTime(60);
    setCurrentTranscript("");
    
    // Check if interview should end
    if (updatedAnswers.length >= 6) {
      console.log("Interview complete - 6 questions answered");
      setTimeout(() => {
        setInterviewOver(true);
        stopInterview(updatedAnswers);
      }, 500);
      return;
    }
    
    // Generate next question immediately
    generateFollowUp(userAnswer, updatedAnswers);
  }

  // generateFollowUp
  async function generateFollowUp(lastAnswer, currentAnswers) {
    console.log("=== GENERATING FOLLOW-UP ===");
    console.log("Last Answer:", lastAnswer);
    console.log("Current Answers:", currentAnswers);
    
    // Double-check if we've reached 6 questions
    if (currentAnswers.length >= 6) {
      console.log("Interview complete - 6 questions answered");
      setTimeout(() => {
        setInterviewOver(true);
        stopInterview(currentAnswers);
      }, 500);
      return;
    }
    
    try {
      // Build question history from all previous questions
      const questionHistory = currentAnswers.map(qa => qa.question);
      console.log("Question History:", questionHistory);

      const payload = {
        token,
        lastAnswer: lastAnswer,
        questionHistory: questionHistory,
        questionMode: "follow_up", // Always follow-up after first question
        topicQuestionCount: currentTopicCount,
        askedSoFar: currentAnswers.length,
      };

      console.log("Sending payload:", payload);

      const res = await fetch(`/api/generate-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'Failed to generate question' }));
        throw new Error(err.error || 'Failed to generate question');
      }

      const data = await res.json();
      console.log("Received question data:", data);
      
      let q = data.question;
      if (!q || q.length < 5) {
        console.log("Using fallback question");
        const fallbackQuestions = [
          "Can you elaborate on the technical challenges you faced in that project?",
          "How did you approach debugging and troubleshooting in that situation?", 
          "What specific technologies did you use and why did you choose them?",
          "Tell me about your role in the team and how you collaborated with others.",
          "What would you do differently if you had to implement that solution again?"
        ];
        q = fallbackQuestions[Math.floor(Math.random()*fallbackQuestions.length)];
      }

      // Update state immediately
      setCurrentTopicCount(prev => prev + 1);
      setQuestion(q);
      console.log("Next question set:", q);
      
      // Speak the question immediately
      setTimeout(() => {
        console.log("Speaking next question");
        speak(q);
      }, 200);

    } catch (err) {
      console.error("Follow-up generation error:", err);
      // If generating a follow up fails, try one more time with a simple question
      const simpleQuestion = "Can you tell me more about your experience with the technologies mentioned in your resume?";
      setQuestion(simpleQuestion);
      setTimeout(() => speak(simpleQuestion), 200);
    }
  }

  async function stopInterview(finalAnswersParam) {
    const finalAnswers = finalAnswersParam || answers;

    // If there's a current question that wasn't saved, save it once
    if (question && question.trim()) {
      const alreadySaved = finalAnswers.some(qa => qa.question === question);
      if (!alreadySaved) {
        const answerText = currentTranscript && currentTranscript.trim() ? currentTranscript.trim() : "(No answer provided)";
        const updated = [...finalAnswers, { question, answer: answerText }];
        generateEvaluation(updated);
        setAnswers(updated);
      } else {
        generateEvaluation(finalAnswers);
      }
    } else {
      generateEvaluation(finalAnswers);
    }

    setInterviewOver(true);
    setInterviewStarted(false);

    if (thinkingTimerRef.current) { clearInterval(thinkingTimerRef.current); thinkingTimerRef.current = null; }
    if (speakingTimerRef.current) { clearInterval(speakingTimerRef.current); speakingTimerRef.current = null; }
    if (autoSubmitTimerRef.current) { clearTimeout(autoSubmitTimerRef.current); autoSubmitTimerRef.current = null; }

    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
  }

  async function generateEvaluation(finalAnswers) {
    setIsEvaluating(true);
    try {
      const res = await fetch(`/api/evaluate-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          answers: finalAnswers, 
          jdText,
          token 
        }),
      });
      const data = await res.json();
      if (res.ok && data.evaluation) setEvaluation(data.evaluation);
      else console.error("Evaluation failed:", data.error);
    } catch (err) {
      console.error("Error generating evaluation:", err);
    } finally {
      setIsEvaluating(false);
    }
  }

  useEffect(() => {
    return () => {
      try { if (recognitionRef.current) recognitionRef.current.stop(); } catch (e) {}
      window.speechSynthesis.cancel();
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
      if (speakingTimerRef.current) clearInterval(speakingTimerRef.current);
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      try {
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(t => t.stop());
        }
      } catch (e) {}
    };
  }, []);

  // Start interview (initial generator)
  async function startInterview() {
    setInterviewStarted(true);
    setError(null);
    setCurrentTopicCount(0);
    setAnswers([]);
    setQuestion(""); // Clear any previous question
    setIsSpeaking(false);
    setIsThinking(false);
    setIsListening(false);

    try {
      const res = await fetch(`/api/generate-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          lastAnswer: "", 
          questionHistory: [], 
          questionMode: "first", 
          topicQuestionCount: 0, 
          askedSoFar: 0 
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'Failed to generate question'}));
        throw new Error(err.error || "Failed to generate question");
      }

      const data = await res.json();
      if (data.question) {
        // Set question first, then speak after a small delay to ensure state update
        setQuestion(data.question);
        setCurrentTopicCount(1);
        
        // Wait for state to settle before speaking
        setTimeout(() => {
          console.log("Speaking question:", data.question);
          speak(data.question);
        }, 500);
      } else {
        setError("Failed to generate question. Please try again.");
        setInterviewStarted(false);
      }
    } catch (err) {
      setError(err.message || "Failed to start interview");
      setInterviewStarted(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1020] to-[#071126] p-6 text-slate-100">
      {!interviewStarted && !interviewOver && (
        <div className="max-w-4xl mx-auto mt-16">
          <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(124,77,255,0.2)] rounded-3xl shadow-2xl p-16 backdrop-blur-lg text-center">
            <div className="mb-10">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#00C2FF] flex items-center justify-center text-black font-bold text-4xl mx-auto mb-8">
                AI
              </div>
              <h1 className="text-7xl font-extrabold mb-6" style={{ textShadow: "0 2px 12px rgba(124,77,255,0.3)" }}>
                Welcome to Your AI Interview
              </h1>
              <p className="text-2xl text-slate-300 mb-10 leading-relaxed">
                You're about to begin an interactive AI-powered interview session. 
                <br />Make sure your camera and microphone are ready.
              </p>
            </div>
            
            {error && (
              <div className="mb-8 p-6 rounded-xl border border-red-400 text-red-300 bg-[rgba(255,0,0,0.08)] text-xl">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            <div className="mb-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xl text-slate-300 mb-12">
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[rgba(124,77,255,0.2)] flex items-center justify-center mr-4">
                    <span className="text-[#7C4DFF] text-2xl">🎤</span>
                  </div>
                  <span className="font-semibold">Microphone Required</span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[rgba(124,77,255,0.2)] flex items-center justify-center mr-4">
                    <span className="text-[#7C4DFF] text-2xl">📹</span>
                  </div>
                  <span className="font-semibold">Camera Required</span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[rgba(124,77,255,0.2)] flex items-center justify-center mr-4">
                    <span className="text-[#7C4DFF] text-2xl">✨</span>
                  </div>
                  <span className="font-semibold">AI-Powered</span>
                </div>
              </div>
            </div>            <button 
              onClick={startInterview} 
              className="px-16 py-8 rounded-2xl font-bold text-3xl bg-gradient-to-r from-[#7C4DFF] to-[#00C2FF] text-black hover:shadow-2xl transform hover:scale-105 transition-all duration-300 shadow-xl"
            >
              🚀 Start Interview
            </button>
            
            <p className="text-lg text-slate-500 mt-8">
              Good luck! Take your time and showcase your skills
            </p>
          </div>
        </div>
      )}

      {interviewStarted && !interviewOver && (
        <div className="min-h-screen grid grid-cols-2">
          {/* Left Panel - AI Interviewer */}
          <div className="bg-[rgba(255,255,255,0.04)] border-r border-[rgba(255,255,255,0.08)] p-12 flex flex-col justify-center">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-6 mb-12">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#00C2FF] flex items-center justify-center text-black font-bold text-3xl">AI</div>
                <div>
                  <div className="text-xl text-slate-300 mb-2">Question {answers.length + 1}</div>
                  <p className="text-3xl font-semibold leading-relaxed">{question || "Loading your first question..."}</p>
                </div>
              </div>

              <div className="space-y-6">
                {isSpeaking && (
                  <div className="px-6 py-4 rounded-xl bg-[rgba(124,77,255,0.12)] text-[#dfe6ff] text-xl font-medium">
                    🗣️ AI is speaking...
                  </div>
                )}
                {isThinking && (
                  <div className="px-6 py-4 rounded-xl bg-[rgba(255,255,255,0.06)] text-[#ffd6a5] text-xl font-medium">
                    🤔 Thinking: {thinkingTime}s
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Candidate Video */}
          <div className="bg-[rgba(255,255,255,0.02)] p-12 flex flex-col">
            <div className="flex-1 flex flex-col">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full flex-1 rounded-2xl object-cover border border-[rgba(255,255,255,0.08)] shadow-2xl mb-8" 
              />
              
              <div className="space-y-6">
                {!isListening && !isSpeaking && !isThinking && (
                  <button 
                    onClick={startListening} 
                    className="w-full py-6 rounded-2xl font-bold text-2xl bg-gradient-to-r from-[#00C2FF] to-[#7C4DFF] text-black hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    🎤 Start Speaking
                  </button>
                )}
                
                {isThinking && (
                  <div className="p-6 rounded-xl bg-[rgba(255,255,255,0.04)] text-slate-300 text-xl">
                    🤔 Thinking: {thinkingTime}s 
                    <button 
                      onClick={startListening} 
                      className="ml-4 text-lg underline hover:text-white transition-colors"
                    >
                      Skip & Speak
                    </button>
                  </div>
                )}
                
                {isListening && (
                  <>
                    <div className="p-6 rounded-xl bg-[rgba(0,0,0,0.6)]">
                      <div className="flex justify-between text-lg text-slate-300 mb-4">
                        <span className="font-medium">🔴 Recording</span>
                        <span className="font-mono">{speakingTime}s / {maxSpeakingTime}s</span>
                      </div>
                      <div className="w-full bg-[rgba(255,255,255,0.1)] h-4 rounded-full">
                        <div 
                          className="h-4 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${(speakingTime / maxSpeakingTime) * 100}%`, 
                            background: "linear-gradient(90deg,#00C2FF,#7C4DFF)" 
                          }} 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={manualSubmit} 
                      className="w-full py-6 rounded-2xl bg-white text-black font-bold text-2xl hover:bg-gray-100 transition-colors"
                    >
                      ✅ Submit Answer
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-center items-center text-slate-400 text-lg mt-8 pt-6 border-t border-[rgba(255,255,255,0.08)]">
              <span>🎯 Interview in Progress - Take your time to provide thoughtful answers</span>
            </div>
          </div>
        </div>
      )}

      {interviewOver && (
        <div className="max-w-6xl mx-auto mt-8">
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] rounded-3xl p-8">
            <h2 className="text-4xl font-bold mb-6 text-center text-white">Interview Results</h2>
            
            {isEvaluating && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-xl text-slate-300">Generating comprehensive evaluation...</p>
              </div>
            )}
            
            {!isEvaluating && evaluation && (
              <div className="space-y-8">
                {/* Score and Decision */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-[rgba(255,255,255,0.05)] rounded-xl">
                    <h3 className="text-2xl font-semibold mb-4 text-blue-400">Overall Score</h3>
                    <div className="text-5xl font-bold text-white mb-2">{evaluation.finalScore}/100</div>
                    <div className="text-lg text-slate-300">{evaluation.verdict}</div>
                  </div>
                  <div className="p-6 bg-[rgba(255,255,255,0.05)] rounded-xl">
                    <h3 className="text-2xl font-semibold mb-4 text-green-400">Hiring Decision</h3>
                    <div className={`text-3xl font-bold mb-2 ${
                      evaluation.hiring_decision === 'HIRE' || evaluation.hiring_decision === 'STRONG HIRE' 
                        ? 'text-green-400' 
                        : evaluation.hiring_decision === 'NO HIRE'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}>
                      {evaluation.hiring_decision || 'PENDING'}
                    </div>
                    <div className="text-lg text-slate-300">{evaluation.recommendedFit}</div>
                  </div>
                </div>

                {/* Detailed Feedback */}
                {evaluation.detailed_feedback && (
                  <div className="p-6 bg-[rgba(255,255,255,0.05)] rounded-xl">
                    <h3 className="text-2xl font-semibold mb-6 text-purple-400">Detailed Assessment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-blue-300 mb-2">Technical Skills</h4>
                        <p className="text-slate-300 mb-4">{evaluation.detailed_feedback.technical_skills}</p>
                        <h4 className="text-lg font-semibold text-blue-300 mb-2">Problem Solving</h4>
                        <p className="text-slate-300">{evaluation.detailed_feedback.problem_solving}</p>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-blue-300 mb-2">Communication</h4>
                        <p className="text-slate-300 mb-4">{evaluation.detailed_feedback.communication}</p>
                        <h4 className="text-lg font-semibold text-blue-300 mb-2">Experience Match</h4>
                        <p className="text-slate-300">{evaluation.detailed_feedback.experience_match}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strengths and Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-[rgba(34,197,94,0.08)] rounded-xl border border-[rgba(34,197,94,0.2)]">
                    <h3 className="text-2xl font-semibold mb-4 text-green-400">✅ Strengths</h3>
                    <ul className="space-y-3">
                      {evaluation.strengths.map((s,i)=>(
                        <li key={i} className="flex items-start">
                          <span className="text-green-400 mr-2 mt-1">•</span>
                          <span className="text-slate-200">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 bg-[rgba(251,191,36,0.08)] rounded-xl border border-[rgba(251,191,36,0.2)]">
                    <h3 className="text-2xl font-semibold mb-4 text-yellow-400">📈 Areas for Improvement</h3>
                    <ul className="space-y-3">
                      {evaluation.improvements.map((s,i)=>(
                        <li key={i} className="flex items-start">
                          <span className="text-yellow-400 mr-2 mt-1">•</span>
                          <span className="text-slate-200">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Next Steps */}
                {evaluation.next_steps && (
                  <div className="p-6 bg-[rgba(255,255,255,0.05)] rounded-xl">
                    <h3 className="text-2xl font-semibold mb-4 text-cyan-400">🎯 Recommended Next Steps</h3>
                    <ul className="space-y-3">
                      {evaluation.next_steps.map((step,i)=>(
                        <li key={i} className="flex items-start">
                          <span className="text-cyan-400 mr-2 mt-1">{i+1}.</span>
                          <span className="text-slate-200">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {!isEvaluating && !evaluation && (
              <div className="text-center py-12">
                <p className="text-xl text-slate-400">No evaluation available. Please try refreshing the page.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
