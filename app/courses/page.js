"use client";

import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  PlayCircle, BookOpen, Clock, BarChart,
  Send, Sparkles, X, ChevronRight, CheckCircle,
  Layers, Video, Loader2, AlertCircle, Trash2
} from 'lucide-react';

const CoursesPage = () => {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: "Hello! 👋 I'm your AI Course Architect! I'm excited to help you learn something new today. What skill would you like to master? I can create personalized courses on anything - from programming and AI to business and creative skills!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);

  const chatContainerRef = useRef(null);

  const API_BASE = "/api/ai";
  const CHAT_API_URL = `${API_BASE}/chat`;
  const COURSE_API_URL = `${API_BASE}/generate-course`;
  const GET_COURSES_API_URL = `${API_BASE}/courses`;
  const DELETE_COURSE_API_URL = `${API_BASE}/courses`;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Fetch user courses on component mount
  useEffect(() => {
    fetchUserCourses();
  }, []);

  const fetchUserCourses = async () => {
    try {
      const response = await fetch(GET_COURSES_API_URL, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCourses(data.courses);
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const deleteCourse = async (courseId, courseName) => {
    if (!confirm(`Are you sure you want to delete "${courseName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${DELETE_COURSE_API_URL}/${courseId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        // Remove course from local state
        setCourses(prev => prev.filter(course => course.id !== courseId));
        setMessages(prev => [...prev, {
          role: 'ai',
          content: `✅ Course "${courseName}" has been deleted successfully!`
        }]);
      } else {
        throw new Error(data.error || 'Failed to delete course');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `❌ Error deleting course "${courseName}". ${error.message}`
      }]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userInput = input.trim();

    // Add user message to UI and history
    const userMsg = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMsg]);
    setConversationHistory(prev => [...prev, { role: 'user', content: userInput }]);
    setInput('');
    setIsGenerating(true);

    // Show thinking indicator
    setMessages(prev => [...prev, { role: 'ai', content: 'thinking...', isLoading: true }]);

    try {
      // --- REAL API CALL to backend /chat ---
      const chatResponse = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          conversation_history: conversationHistory
        })
      });

      const chatData = await chatResponse.json();

      // Remove loading indicator
      setMessages(prev => prev.filter(msg => !msg.isLoading));

      if (!chatData.success) {
        throw new Error(chatData.error || 'Chat API failed');
      }

      // Add AI reply to UI and history
      setMessages(prev => [...prev, { role: 'ai', content: chatData.response }]);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: chatData.response }]);

      // If backend says generate a course, do it
      if (chatData.should_generate && chatData.topic) {
        setIsGenerating(true);
        setMessages(prev => [...prev, {
          role: 'ai',
          content: `🔍 Analyzing "${chatData.topic}" and finding the best learning resources... This might take 30–60 seconds!`,
          isLoading: true
        }]);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          const courseResponse = await fetch(COURSE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: chatData.topic,
              difficulty: chatData.difficulty || "Beginner",
              duration: "Comprehensive"
            }),
            signal: controller.signal,
            credentials: 'include'
          });

          clearTimeout(timeoutId);

          if (!courseResponse.ok) {
            throw new Error(`HTTP ${courseResponse.status}: ${courseResponse.statusText}`);
          }

          const courseData = await courseResponse.json();
          setMessages(prev => prev.filter(msg => !msg.isLoading));

          if (courseData.success && courseData.course) {
            const newCourse = courseData.course;
            const savedCourse = courseData.saved_course;

            setMessages(prev => [...prev, {
              role: 'ai',
              content: `🎉 Amazing! I've created "${newCourse.title}" for you! This course has ${newCourse.lessons.length} professionally curated lessons with real YouTube tutorials. The course has been saved to your library. Click on it below to start your learning journey!`
            }]);

            // Use the saved course from database (includes ID and proper thumbnail)
            setCourses(prev => [savedCourse, ...prev]);
          } else {
            let errorMessage = `I had trouble generating the course for "${chatData.topic}". Please try again!`;
            if (courseData.error) {
              if (courseData.error.includes('RESOURCE_EXHAUSTED') || courseData.error.includes('Quota exceeded')) {
                errorMessage = `⏰ Daily AI quota reached! Our Gemini API has hit its limit for today. Please try again tomorrow — "${chatData.topic}" will make a great course!`;
              } else if (courseData.error.includes('429')) {
                errorMessage = `⏰ Too many requests! Please wait a moment and try again for "${chatData.topic}".`;
              } else if (courseData.error.includes('503')) {
                errorMessage = `🔧 AI service temporarily unavailable. Please retry in a few minutes for "${chatData.topic}".`;
              }
            }
            setMessages(prev => [...prev, { role: 'ai', content: errorMessage }]);
            console.error('Course data issue:', courseData);
          }

        } catch (courseError) {
          setMessages(prev => prev.filter(msg => !msg.isLoading));
          if (courseError.name === 'AbortError') {
            setMessages(prev => [...prev, {
              role: 'ai',
              content: `Creating a course for "${chatData.topic}" is taking longer than expected. Please try again!`
            }]);
          } else {
            setMessages(prev => [...prev, {
              role: 'ai',
              content: `I'm having trouble generating the course for "${chatData.topic}" right now. Please try again in a moment!`
            }]);
          }
          console.error('Course generation error:', courseError);
        }
      }

    } catch (error) {
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      setMessages(prev => [...prev, {
        role: 'ai',
        content: "Hmm, I had trouble connecting. Please check that the server is running and try again!"
      }]);
      console.error('Chat error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Render Player ---
  const renderPlayer = () => {
    if (!activeCourse) return null;
    const currentLesson = activeCourse.lessons[activeLessonIndex];

    const getVideoId = (url) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };
    const videoId = getVideoId(currentLesson.videoUrl);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative">

          <button
            onClick={() => setActiveCourse(null)}
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-full md:w-3/4 bg-black flex flex-col">
            <div className="relative flex-grow">
              {videoId ? (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                  title={currentLesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <AlertCircle className="w-8 h-8 mr-2" /> Video Unavailable
                </div>
              )}
            </div>
            <div className="p-6 bg-white border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentLesson.title}</h2>
              <p className="text-gray-600">{currentLesson.description}</p>
            </div>
          </div>

          <div className="w-full md:w-1/4 bg-gray-50 border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-bold text-gray-900">Course Content</h3>
              <p className="text-xs text-gray-500">{activeCourse.lessons.length} Lessons</p>
            </div>
            <div className="overflow-y-auto flex-grow p-2 space-y-2">
              {activeCourse.lessons.map((lesson, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveLessonIndex(idx)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 flex gap-3 ${
                    idx === activeLessonIndex
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-white hover:shadow-sm text-gray-700'
                  }`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === activeLessonIndex ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="line-clamp-2 font-medium">{lesson.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      {renderPlayer()}

      <main className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Chat Interface */}
          <div className="lg:col-span-1 h-[600px] flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Course Generator Agent
            </div>

            <div
              ref={chatContainerRef}
              className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/50"
            >
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{msg.content}</span>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Start Buttons */}
            {messages.length <= 1 && (
              <div className="p-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">Quick Start:</p>
                <div className="flex flex-wrap gap-2">
                  {['Python Basics', 'React Development', 'Machine Learning', 'Data Science', 'Web Design'].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setInput(topic)}
                      className="px-3 py-1 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 text-xs rounded-full transition-colors"
                      disabled={isGenerating}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Try: 'Hi', 'Python for beginners', 'Advanced React'..."
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isGenerating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Right: Courses Grid */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Your Generated Courses
            </h2>

            {courses.length === 0 ? (
              <div className="h-[550px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-medium">No courses generated yet</p>
                <p className="text-sm">Use the chat to create your first course</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map((course, idx) => (
                  <div key={course.id || idx} className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                    <div className="h-40 bg-gray-100 relative overflow-hidden">
                      {course.thumbnail || course.lessons?.[0]?.thumbnail ? (
                        <img
                          src={course.thumbnail || course.lessons[0].thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
                          <Video className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => { setActiveCourse(course); setActiveLessonIndex(0); }}
                          className="bg-white/90 text-gray-900 rounded-full p-3 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                        >
                          <PlayCircle className="w-8 h-8 text-blue-600" />
                        </button>
                      </div>
                      {course.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCourse(course.id, course.title);
                          }}
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-600 mb-2">
                        <span className="px-2 py-1 bg-blue-50 rounded-md">AI Generated</span>
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md">{course.totalLessons || course.lessons?.length || 0} Lessons</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{course.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">{course.description}</p>
                      <button
                        onClick={() => { setActiveCourse(course); setActiveLessonIndex(0); }}
                        className="w-full mt-auto py-2.5 rounded-lg border border-gray-200 hover:border-blue-600 hover:text-blue-600 font-medium text-sm text-gray-700 transition-colors flex items-center justify-center gap-2"
                      >
                        Start Learning <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CoursesPage;