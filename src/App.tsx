import React, { useState, useEffect } from "react";
import {
  Book,
  BorrowRecord,
  Fine,
  Payment,
  Notification,
  LearningPath,
  GraphNode,
  GraphEdge
} from "./types";
import {
  BookOpen,
  Search,
  User,
  Users,
  Settings,
  AlertCircle,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Map,
  History,
  Bell,
  FileText,
  ArrowRight,
  Plus,
  Trash2,
  Edit,
  Layers,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  BookCheck,
  BookMarked,
  Award,
  LogOut,
  Sliders,
  HelpCircle
} from "lucide-react";
import KnowledgeGraph from "./components/KnowledgeGraph";
import AnalyticsCharts from "./components/AnalyticsCharts";

export default function App() {
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [catalog, setCatalog] = useState<Book[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [relationships, setRelationships] = useState<GraphEdge[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);

  // Page active tabs
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Interaction States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const [customCsv, setCustomCsv] = useState<string>("");

  // Detailed Modal for AI Insights
  const [inspectingBook, setInspectingBook] = useState<Book | null>(null);
  const [aiInsights, setAiInsights] = useState<any | null>(null);
  const [loadingInsights, setLoadingInsights] = useState<boolean>(false);

  // Recommendations state
  const [recs, setRecs] = useState<{
    contentBased: any[];
    graphBased: any[];
    hybrid: any[];
  } | null>(null);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);

  // Book Editor states
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    publisher: "",
    genre: "Computer Science",
    subject: "Programming Foundations",
    description: "",
    publicationYear: 2026,
    totalCopies: 5,
    difficulty: "Beginner",
    keyTopicsString: "",
    prerequisitesString: "",
    antiRequisitesString: ""
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // User Register states
  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    role: "student",
    phone: ""
  });
  const [showRegModal, setShowRegModal] = useState<boolean>(false);

  // Toast / System updates
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Fetch full dataset from our production Express server
  const refetchData = async () => {
    try {
      const [resBooks, resBorrow, resFines, resPayments, resGraph, resPaths, resUsers] = await Promise.all([
        fetch("/api/books").then((r) => r.json()),
        fetch("/api/borrow").then((r) => r.json()),
        fetch("/api/fines").then((r) => r.json()),
        fetch("/api/payments").then((r) => r.json()),
        fetch("/api/graph").then((r) => r.json()),
        fetch("/api/learning-paths").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json())
      ]);

      setCatalog(resBooks);
      setBorrowRecords(resBorrow);
      setFines(resFines);
      setPayments(resPayments);
      setRelationships(resGraph.relationships);
      setLearningPaths(resPaths);
      setDbUsers(resUsers);

      // Auto-populate logged in profile if not already set, using Alice as demo star
      if (!currentUser && resUsers.length > 0) {
        // Find Alice
        const alice = resUsers.find((u: any) => u.name.includes("Alice")) || resUsers[0];
        setCurrentUser(alice);
      }
    } catch (err) {
      console.error("Data fetching error:", err);
      showToast("error", "Error connecting to backend services.");
    }
  };

  useEffect(() => {
    refetchData();
  }, []);

  // Fetch notifications and recommendations every time active user shifts
  useEffect(() => {
    if (currentUser) {
      fetchNotifs();
      fetchRecommendations();
    }
  }, [currentUser]);

  const fetchNotifs = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications/${currentUser.id}`);
      const data = await res.json();
      setNotifications(data);
    } catch (e) {
      console.error("Notifs fetching error:", e);
    }
  };

  const fetchRecommendations = async () => {
    if (!currentUser) return;
    setLoadingRecs(true);
    try {
      const res = await fetch(`/api/recommendations?userId=${currentUser.id}`);
      const data = await res.json();
      setRecs(data);
    } catch (err) {
      console.warn("Using localized campus recommendation system due to high key demand:", err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // Switch Profiles Instantly (Mock JWT Token set)
  const handleProfileSwitch = (user: any) => {
    setCurrentUser(user);
    setActiveTab("dashboard");
    showToast("success", `Authorized and switched profile context to ${user.name} (${user.role.toUpperCase()})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast("info", "Logged out. Switched to Guest inspection layout.");
  };

  // Perform AI Semantic Search via backend Gemini mapping
  const triggerSemanticSearch = async (queryToSubmit?: string) => {
    const q = queryToSubmit || searchQuery;
    if (!q.trim()) {
      showToast("error", "Search keyword is empty");
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      setSearchResults(data);
      showToast("success", `Retrieved ${data.length} relevant book matches.`);
    } catch (err) {
      showToast("error", "AI Semantic Search failed. Serving keywords matches instead.");
    } finally {
      setIsSearching(false);
    }
  };

  // Pre-load prompt queries for excellent UX
  const sampleSearchPrompts = [
    "Books for learning AI and DL from scratch",
    "Beginner Python guides with code samples",
    "Data Science roadmaps and analytics"
  ];

  // Inspect book for AI Insights Modal
  const loadBookInsights = async (book: Book) => {
    setInspectingBook(book);
    setLoadingInsights(true);
    setAiInsights(null);
    try {
      const res = await fetch(`/api/insights/${book.id}`);
      const data = await res.json();
      setAiInsights(data);
    } catch (err) {
      console.warn("Using localized handbook index details due to high key demand:", err);
      // Fallback
      setAiInsights({
        summary: book.description,
        difficulty: book.difficulty || "Beginner",
        keyTopics: book.keyTopics || [book.subject],
        recommendedAudience: book.recommendedAudience || "Undergraduate Students"
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  // Check out book flow
  const handleBorrow = async (bookId: string) => {
    if (!currentUser) {
      showToast("error", "You must log in to borrow books");
      return;
    }
    try {
      const res = await fetch("/api/borrow/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, bookId })
      });
      const data = await res.json();

      if (data.rulesCheckFailed) {
        showToast("error", data.message);
      } else if (data.error) {
        showToast("error", data.error);
      } else {
        showToast("success", data.status === "waitlisted" 
          ? `Waitlisted successfully for '${catalog.find(b => b.id === bookId)?.title}'`
          : `Checked out successfully! Pick up inside Academic Corridor.`);
        refetchData();
        fetchNotifs();
      }
    } catch (err) {
      showToast("error", "Borrow request transmission error.");
    }
  };

  // Return book log approval
  const handleReturn = async (borrowId: string) => {
    try {
      const res = await fetch("/api/borrow/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrowId })
      });
      const data = await res.json();
      if (data.error) {
        showToast("error", data.error);
      } else {
        showToast("success", "Item returned and processed through library ledger safely.");
        refetchData();
        fetchNotifs();
      }
    } catch (err) {
      showToast("error", "Return dispatch failed.");
    }
  };

  // Renew book copies
  const handleRenew = async (borrowId: string) => {
    try {
      const res = await fetch("/api/borrow/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrowId })
      });
      const data = await res.json();
      if (data.error) {
        showToast("error", data.error);
      } else {
        showToast("success", "Circulation dates successfully extended!");
        refetchData();
      }
    } catch (e) {
      showToast("error", "Renewal request failed.");
    }
  };

  // Clear unpaid fine logs
  const handlePayFine = async (fineId: string) => {
    try {
      const res = await fetch("/api/fines/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fineId })
      });
      const data = await res.json();
      if (data.error) {
        showToast("error", data.error);
      } else {
        showToast("success", `Paid fine: Receipt ${data.payment.transactionId} generated.`);
        refetchData();
      }
    } catch (e) {
      showToast("error", "Payment processor connection error.");
    }
  };

  // Add or Edit book administrative flow
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author) {
      showToast("error", "Title and Author are required");
      return;
    }

    const payload = {
      ...bookForm,
      keyTopics: bookForm.keyTopicsString.split(",").map((s) => s.trim()).filter(Boolean),
      prerequisites: bookForm.prerequisitesString.split(",").map((s) => s.trim()).filter(Boolean),
      antiRequisites: bookForm.antiRequisitesString.split(",").map((s) => s.trim()).filter(Boolean)
    };

    try {
      const url = editingBookId ? `/api/books/${editingBookId}` : "/api/books";
      const method = editingBookId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.error) {
        showToast("error", data.error);
      } else {
        showToast("success", editingBookId ? "Book definitions updated!" : "Book added to index catalog successfully.");
        // Close form
        setShowAddForm(false);
        setEditingBookId(null);
        resetBookForm();
        refetchData();
      }
    } catch (err) {
      showToast("error", "Error uploading book metadata definitions.");
    }
  };

  const handleEditBookClick = (book: Book) => {
    // Collect pre-reqs and anti-reqs IDs by walking relations
    const preIds = relationships.filter((r) => r.target === book.id && r.type === "prerequisite").map((r) => r.source);
    const arIds = relationships.filter((r) => (r.source === book.id || r.target === book.id) && r.type === "anti_requisite").map((r) => r.source === book.id ? r.target : r.source);

    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      publisher: book.publisher || "",
      genre: book.genre,
      subject: book.subject,
      description: book.description,
      publicationYear: book.publicationYear,
      totalCopies: book.totalCopies,
      difficulty: book.difficulty || "Beginner",
      keyTopicsString: (book.keyTopics || []).join(", "),
      prerequisitesString: preIds.join(", "),
      antiRequisitesString: arIds.join(", ")
    });
    setEditingBookId(book.id);
    setShowAddForm(true);
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to remove this book and all its associated graph nodes?")) return;
    try {
      const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Book removed from index securely.");
        refetchData();
      }
    } catch (err) {
      showToast("error", "Delete request failed.");
    }
  };

  const resetBookForm = () => {
    setBookForm({
      title: "",
      author: "",
      isbn: "",
      publisher: "",
      genre: "Computer Science",
      subject: "Programming Foundations",
      description: "",
      publicationYear: 2026,
      totalCopies: 5,
      difficulty: "Beginner",
      keyTopicsString: "",
      prerequisitesString: "",
      antiRequisitesString: ""
    });
  };

  // CSV Bulk Upload handler
  const handleCsvBulkUpload = async () => {
    if (!customCsv.trim()) {
      showToast("error", "CSV textbook definitions segment cannot be empty");
      return;
    }
    try {
      const res = await fetch("/api/books/csv-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: customCsv })
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `Bulk imported completed! added ${data.count} new books.`);
        setCustomCsv("");
        refetchData();
      } else {
        showToast("error", data.error || "CSV parsing error.");
      }
    } catch (err) {
      showToast("error", "CSV import server failure.");
    }
  };

  // User Administration - Toggle account Status
  const toggleUserSuspension = async (user: any) => {
    const targetStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (data.error) {
        showToast("error", data.error);
      } else {
        showToast("success", `Account status changed! ${user.name} is now ${targetStatus}.`);
        refetchData();
      }
    } catch (e) {
      showToast("error", "Account status change request failed.");
    }
  };

  // Create registration profile
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm)
      });
      const data = await res.json();
      if (data.error) {
        showToast("error", data.error);
      } else {
        showToast("success", "Account registration completed successfully!");
        setShowRegModal(false);
        setRegForm({ name: "", email: "", role: "student", phone: "" });
        refetchData();
      }
    } catch (err) {
      showToast("error", "Registration delivery failed.");
    }
  };

  // Mark single notifications as read
  const markNotifRead = async (id: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id })
      });
      fetchNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  // Export CSV Download helper
  const handleDownloadReport = (type: string) => {
    window.open(`/api/reports/${type}`);
    showToast("success", `Report downloading started for academic segment: ${type}`);
  };

  // Simple date formatter
  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Active borrow records specific values
  const activeLoansCount = borrowRecords.filter(
    (b) => currentUser && b.userId === currentUser.id && b.status === "borrowed"
  ).length;

  const activeUnpaidFinesAmount = fines
    .filter((f) => currentUser && f.userId === currentUser.id && f.status === "unpaid")
    .reduce((sum, f) => sum + f.fineAmount, 0);

  const notificationsUnreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-950 selection:bg-blue-600 selection:text-white antialiased">
      {/* Dynamic Toast banner systems */}
      {alertMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-2xl animate-fade-in">
          <span className={`w-2.5 h-2.5 rounded-full ${
            alertMsg.type === "success" ? "bg-blue-600 animate-pulse" : alertMsg.type === "error" ? "bg-rose-500" : "bg-blue-500"
          }`} />
          <span className="text-xs font-bold text-slate-800">{alertMsg.text}</span>
        </div>
      )}

      {/* GLOBAL SYSTEM HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between text-slate-900 shadow-sm animate-fade-in">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <BookCheck className="w-5 h-5 text-white stroke-[2]" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center space-x-1 uppercase">
              <span>Syllabus AI</span>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200/50 font-mono font-bold tracking-widest leading-none ml-1.5 animate-pulse">
                v2.5
              </span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold tracking-wide uppercase">Powered by Google Gemini</p>
          </div>
        </div>

        {/* PROFILE TESTING DESK PANEL */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-xl p-1 px-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wide text-slate-500 pr-1 select-none">Test Persona:</span>
            {dbUsers.map((u) => {
              const isActive = currentUser?.id === u.id;
              const roleColors: { [key: string]: string } = {
                student: "hover:text-blue-600 border-transparent hover:bg-white/40",
                librarian: "hover:text-indigo-650 border-transparent hover:bg-white/40",
                admin: "hover:text-rose-650 border-transparent hover:bg-white/40"
              };
              const activeColors: { [key: string]: string } = {
                student: "bg-white text-blue-600 border-slate-200 shadow-sm",
                librarian: "bg-white text-indigo-700 border-slate-200 shadow-sm",
                admin: "bg-white text-rose-700 border-slate-200 shadow-sm"
              };

              return (
                <button
                  key={u.id}
                  onClick={() => handleProfileSwitch(u)}
                  className={`text-[10px] font-bold pin-action px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    isActive ? activeColors[u.role] : `text-slate-500 bg-transparent ${roleColors[u.role]}`
                  }`}
                >
                  {u.name.split(" ")[0]} ({u.role.toUpperCase()})
                </button>
              );
            })}
            <button
              onClick={() => setShowRegModal(true)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-slate-500" />
              <span>Invite</span>
            </button>
          </div>

          {/* NOTIFICATION CENTER INBOX TRAY */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                fetchNotifs();
              }}
              className="relative p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 font-bold shadow-sm transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notificationsUnreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl z-50 animate-fade-in divide-y divide-slate-100 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Academic Inbox</h4>
                  <span className="text-[10px] font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50">
                    {notifications.length} Alerts
                  </span>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">
                    No academic logs to display.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotifRead(n.id)}
                      className={`py-2.5 cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition-all flex items-start space-x-2.5 ${
                        n.status === "unread" ? "bg-blue-50/20" : ""
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        n.type === "fine" ? "bg-rose-500" : n.type === "loan" ? "bg-amber-500" : "bg-blue-500"
                      }`} />
                      <div className="flex-1 text-[11px] leading-snug">
                        <p className={`font-semibold ${n.status === "unread" ? "text-slate-900 font-bold" : "text-slate-500"}`}>{n.message}</p>
                        <span className="text-[9px] font-bold text-slate-400 font-mono inline-block mt-1">{formatDate(n.date)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {" "}
          {/* ACTIVE ACCOUNT BUTTON */}
          <div className="flex items-center space-x-2.5 bg-white p-1.5 pr-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-slate-550 bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-[11px] font-black text-slate-900">{currentUser?.name || "Student Guest"}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{currentUser?.role || "GUEST"}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* MOBILE PERSONA SWITCHER ALERT TRAY */}
        <div className="lg:hidden flex flex-wrap gap-2 items-center justify-between mb-4 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Test Persona Switcher:</span>
          <div className="flex flex-wrap gap-1.5">
            {dbUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleProfileSwitch(u)}
                className={`text-[9px] font-black px-2 py-1 rounded-md border cursor-pointer ${
                  currentUser?.id === u.id ? "bg-blue-600 text-white border-blue-500 font-bold shadow-sm" : "text-slate-650 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {u.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN STRUCTURAL VIEW LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* NAVIGATION SIDEBAR */}
          <aside className="lg:col-span-3 flex flex-col space-y-1.5 bg-transparent">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-3 select-none mb-1 block">
              Circulation Portals
            </span>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === "dashboard" ? "bg-blue-600 text-white shadow-md shadow-blue-100 font-bold" : "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100/70 font-semibold"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-slate-550" />
              <span>Core Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("semantic")}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === "semantic" ? "bg-blue-600 text-white shadow-md shadow-blue-100 font-bold" : "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100/70 font-semibold"
              }`}
            >
              <Search className="w-4 h-4 text-slate-550" />
              <span>Semantic Search</span>
            </button>

            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === "graph" ? "bg-blue-600 text-white shadow-md shadow-blue-100 font-bold" : "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100/70 font-semibold"
              }`}
            >
              <Layers className="w-4 h-4 text-slate-550" />
              <span>Knowledge Graph</span>
            </button>

            <button
              onClick={() => setActiveTab("paths")}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === "paths" ? "bg-blue-600 text-white shadow-md shadow-blue-100 font-bold" : "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100/70 font-semibold"
              }`}
            >
              <Map className="w-4 h-4 text-slate-550" />
              <span>Learning Paths</span>
            </button>

            {currentUser?.role === "student" && (
              <>
                <button
                  onClick={() => setActiveTab("loans")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all relative cursor-pointer ${
                    activeTab === "loans" ? "bg-blue-600 text-white shadow-md shadow-blue-100 font-bold" : "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100/70 font-semibold"
                  }`}
                >
                  <History className="w-4 h-4 text-slate-550" />
                  <span>My Active Books</span>
                  {activeLoansCount > 0 && (
                    <span className="absolute right-3 top-2.5 text-[9px] bg-amber-100 font-black text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      {activeLoansCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("fines")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all relative cursor-pointer ${
                    activeTab === "fines" ? "bg-blue-600 text-white shadow-md shadow-blue-100 font-bold" : "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100/70 font-semibold"
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-slate-550" />
                  <span>Fine desk</span>
                  {activeUnpaidFinesAmount > 0 && (
                    <span className="absolute right-3 top-2.5 text-[9px] bg-rose-100 font-black text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded-full">
                      ₹{activeUnpaidFinesAmount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* ADMINISTRATIVE DEPARTMENTS (Only Admin/Librarian) */}
            {(currentUser?.role === "admin" || currentUser?.role === "librarian") && (
              <div className="pt-6 space-y-1.5">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest pl-3 select-none mb-1 block">
                  Librarian Desks
                </span>
                <button
                  onClick={() => {
                    setActiveTab("admin-books");
                    setShowAddForm(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all cursor-pointer ${
                    activeTab === "admin-books" ? "bg-indigo-600 text-white shadow-md shadow-indigo-150 font-bold" : "text-slate-600 hover:text-indigo-700 bg-transparent hover:bg-indigo-50/50 font-semibold"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-slate-550" />
                  <span>Manage Catalog</span>
                </button>

                <button
                  onClick={() => setActiveTab("admin-borrow")}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all cursor-pointer ${
                    activeTab === "admin-borrow" ? "bg-indigo-600 text-white shadow-md shadow-indigo-150 font-bold" : "text-slate-600 hover:text-indigo-700 bg-transparent hover:bg-indigo-50/50 font-semibold"
                  }`}
                >
                  <FileText className="w-4 h-4 text-slate-550" />
                  <span>Circulation Logs</span>
                </button>

                <button
                  onClick={() => setActiveTab("admin-users")}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all cursor-pointer ${
                    activeTab === "admin-users" ? "bg-indigo-600 text-white shadow-md shadow-indigo-150 font-bold" : "text-slate-600 hover:text-indigo-700 bg-transparent hover:bg-indigo-50/50 font-semibold"
                  }`}
                >
                  <Users className="w-4 h-4 text-slate-550" />
                  <span>Student Rosters</span>
                </button>

                <button
                  onClick={() => setActiveTab("admin-reports")}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold leading-none tracking-wide uppercase transition-all cursor-pointer ${
                    activeTab === "admin-reports" ? "bg-indigo-600 text-white shadow-md shadow-indigo-150 font-bold" : "text-slate-600 hover:text-indigo-700 bg-transparent hover:bg-indigo-50/50 font-semibold"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-550" />
                  <span>Export Reports</span>
                </button>
              </div>
            )}
          </aside>

          {/* MAIN PAGE CENTRAL DISPLAY PORT */}
          <main className="lg:col-span-9 space-y-6">
            {/* 1. VIEW TAB: CORE DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                {/* Personalized Welcome Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-white via-white to-blue-50/50 border border-slate-200 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-sm">
                  {/* Subtle decorative circles */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="z-10 max-w-xl">
                    <span className="text-[10px] uppercase font-black text-blue-600 tracking-wider mb-1.5 block">University Campus Index</span>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                      Avenue of Academic Knowledge, <span className="text-gradient bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{currentUser?.name}</span>
                    </h2>
                    <p className="text-xs text-slate-500 max-w-sm font-medium mt-2 leading-relaxed">
                      Leverage our modern neural graph pathways, anti-requisite alerts, and Gemini powered semantic searching to chart custom research directions!
                    </p>
                  </div>
                  <div className="hidden md:flex flex-col items-center justify-center p-3.5 bg-slate-50 border border-slate-200 rounded-2xl w-28 text-center shrink-0 shadow-sm">
                    <span className="text-[9px] uppercase font-black text-slate-450 tracking-wider">My Streak</span>
                    <span className="text-2xl font-black text-amber-500 font-mono inline-block my-1 animate-pulse">
                      12
                    </span>
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">Days Study</span>
                  </div>
                </div>

                {/* KPI Metrics Box Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Catalog</span>
                    <span className="text-2xl font-black font-mono text-slate-900 mt-1.5">{catalog.length}</span>
                    <p className="text-[10px] text-slate-500 mt-2 font-semibold">Unique textbook titles</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Borrowers</span>
                    <span className="text-2xl font-black font-mono text-slate-900 mt-1.5">
                      {dbUsers.filter(u => u.role === "student").length}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-2 font-semibold">Registered student profiles</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Borrowings Count</span>
                    <span className="text-2xl font-black font-mono text-slate-900 mt-1.5">
                      {borrowRecords.filter(br => br.status === "borrowed").length}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-2 font-semibold">Textbooks on loan right now</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payments Received</span>
                    <span className="text-2xl font-black font-mono text-blue-600 mt-1.5">
                      ₹{payments.reduce((sum, p) => sum + p.amount, 0)}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-2 font-semibold">Cleared overdue collections</p>
                  </div>
                </div>

                {/* Main Dashboard Workspace (Charts or personal student overview) */}
                {currentUser?.role === "student" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Student Left Column: Active borrowing info */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Curated AI Personalized Recommendations */}
                      <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span>Recommended For You</span>
                          </h3>
                          <button
                            onClick={fetchRecommendations}
                            className="text-[10px] bg-slate-950 px-2 py-1 border border-slate-800 rounded-lg font-bold text-slate-400 hover:text-white transition-all"
                          >
                            Recalculate
                          </button>
                        </div>

                        {loadingRecs ? (
                          <div className="py-12 flex flex-col items-center justify-center space-y-3">
                            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                            <span className="text-xs text-slate-500 font-medium">Running Hybrid content-based algorithms...</span>
                          </div>
                        ) : recs ? (
                          <div className="space-y-3">
                            {recs.hybrid && recs.hybrid.length > 0 && (
                              <div className="bg-gradient-to-r from-slate-950 via-slate-950 to-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 flex items-start space-x-3.5 hover:border-emerald-500/30 transition-all">
                                <Award className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className="text-xs font-bold text-white truncate">{recs.hybrid[0].title}</h4>
                                    <span className="text-[9px] font-mono font-bold text-emerald-400">95% Match</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1 lines-clamp-2 leading-relaxed">
                                    {recs.hybrid[0].aiReason}
                                  </p>
                                  <div className="flex justify-between items-center mt-3">
                                    <span className="text-[10px] text-slate-500 font-medium font-sans">By {recs.hybrid[0].author}</span>
                                    <button
                                      onClick={() => loadBookInsights(recs.hybrid[0])}
                                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold tracking-wide uppercase"
                                    >
                                      Inspect Insights &rarr;
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                              {recs.contentBased && recs.contentBased.map((item, idx) => (
                                <div key={idx} className="bg-slate-950 border border-slate-800/60 rounded-xl p-3.5 hover:border-slate-700 transition-all min-w-0 flex flex-col justify-between">
                                  <div>
                                    <div className="flex justify-between items-start gap-1">
                                      <span className="inline-block text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-indigo-400 font-semibold rounded mb-2 uppercase">Content Based</span>
                                      <span className="text-[9px] font-mono text-indigo-400 font-bold">Similar Genre</span>
                                    </div>
                                    <h4 className="text-xs font-bold text-white truncate leading-snug">{item.title}</h4>
                                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1 line-clamp-2">{item.aiReason || item.description}</p>
                                  </div>
                                  <div className="flex items-center justify-between pt-3 border-t border-slate-900/50 mt-3">
                                    <span className="text-[10px] text-slate-500 font-medium">By {item.author}</span>
                                    <button onClick={() => loadBookInsights(item)} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase">Inspect</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-500 text-xs font-medium">
                            No recommendations model data saved. Try borrowing books first!
                          </div>
                        )}
                      </div>

                      {/* Hot items catalog preview listing */}
                      <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-5">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Textbooks Library</h3>
                          <button
                            onClick={() => setActiveTab("semantic")}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold uppercase flex items-center space-x-1"
                          >
                            <span>Browse All</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          {catalog.slice(0, 3).map((book) => (
                            <div key={book.id} className="bg-slate-950 border border-slate-800/40 rounded-xl p-4 flex items-center justify-between hover:border-slate-800 transition-all flex-col sm:flex-row gap-4">
                              <div className="flex items-start space-x-3.5">
                                <div className="w-10 h-12 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center shrink-0">
                                  <BookMarked className="w-5 h-5 text-slate-600" />
                                </div>
                                <div className="text-left">
                                  <span className="inline-block text-[10px] font-semibold text-teal-400 mb-1">{book.subject}</span>
                                  <h4 className="text-xs font-bold text-white leading-snug">{book.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Author: {book.author}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0 border-t sm:border-0 border-slate-900 pt-3 sm:pt-0 justify-between sm:justify-start">
                                <span className="text-[11px] text-slate-500 font-mono font-medium">Available: {book.availableCopies}/{book.totalCopies}</span>
                                <button
                                  onClick={() => loadBookInsights(book)}
                                  className="text-xs bg-slate-900 hover:bg-slate-850 px-3 py-1.5 border border-slate-800 rounded-xl font-bold tracking-wide uppercase transition-all"
                                >
                                  AI Insights
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Student Right Column: Quick Stats Panel */}
                    <div className="space-y-6">
                      {/* Notifications Brief desk */}
                      <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                          <span>Latest Messages</span>
                        </h3>
                        {notifications.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs font-medium">
                            Inbox pristine and clean!
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                            {notifications.slice(0, 3).map((n) => (
                              <div key={n.id} className="bg-slate-950 border border-slate-850/60 rounded-xl p-3 text-[11px] relative leading-relaxed">
                                <p className="text-slate-300 font-medium">{n.message}</p>
                                <span className="text-[9px] font-bold text-slate-500 inline-block font-mono mt-1">{formatDate(n.date)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dynamic Deadlines Calendars */}
                      <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Academic Milestones</h3>
                        <div className="space-y-3 text-xs">
                          {borrowRecords.filter(br => br.userId === currentUser.id && br.status === "borrowed").map((br) => {
                            const book = catalog.find(b => b.id === br.bookId);
                            const now = Date.now();
                            const due = new Date(br.dueDate).getTime();
                            const isLate = now > due;
                            const daysDiff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

                            return (
                              <div key={br.id} className="flex items-start justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-900">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-300 block line-clamp-1">{book ? book.title : "Circulation Item"}</span>
                                  <span className="text-[10px] text-slate-500 block">Due date: {formatDate(br.dueDate)}</span>
                                </div>
                                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase shrink-0 ${
                                  isLate ? "bg-rose-950 text-rose-400" : daysDiff <= 3 ? "bg-amber-950 text-amber-400" : "bg-emerald-950 text-emerald-400"
                                }`}>
                                  {isLate ? "Late" : daysDiff === 0 ? "Today" : `${daysDiff}d left`}
                                </span>
                              </div>
                            );
                          })}
                          {borrowRecords.filter(br => br.userId === currentUser.id && br.status === "borrowed").length === 0 && (
                            <span className="text-xs text-slate-500 italic block pl-1">
                              0 dynamic milestones queued. Borrow a book to map deadline trackers!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // LIBRARIAN OR ADMIN VIEW: Mount Full Charts Ecosystem!
                  <div className="space-y-6">
                    <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-4 rounded-2xl border border-slate-900 flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest block mb-1">Administrative Statistics</span>
                        <h3 className="text-lg font-bold text-white uppercase">System Analytics Hub</h3>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl">
                        Active librarian ledger status: ONLINE
                      </span>
                    </div>

                    <AnalyticsCharts
                      books={catalog}
                      borrowRecords={borrowRecords}
                      fines={fines}
                      payments={payments}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 2. VIEW TAB: AI SEMANTIC SEARCH */}
            {activeTab === "semantic" && (
              <div className="space-y-6 animate-fade-in">
                {/* Search Bar Segment */}
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-emerald-450 text-emerald-400" />
                      <span>Gemini-powered Semantic Search</span>
                    </h2>
                    <p className="text-xs text-slate-400 leading-normal mt-1">
                      Our semantic search engine uses the Gemini LLM text embeddings vector understanding. It matches meanings, topics, and difficulty levels, far beyond exact keyword matches.
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                      <input
                        type="text"
                        placeholder="Search books by natural language query (e.g. books for learning AI from scratch)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && triggerSemanticSearch()}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-xs text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                      />
                    </div>
                    <button
                      onClick={() => triggerSemanticSearch()}
                      disabled={isSearching}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold px-6 py-3.5 rounded-xl text-xs tracking-wider transition-all shadow-md uppercase flex items-center space-x-2 cursor-pointer shrink-0"
                    >
                      {isSearching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Searching</span>
                        </>
                      ) : (
                        <span>Search</span>
                      )}
                    </button>
                  </div>

                  {/* Suggestion Tray */}
                  <div className="pt-2 border-t border-slate-950 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest pl-1">Instant Suggesters:</span>
                    {sampleSearchPrompts.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSearchQuery(p);
                          triggerSemanticSearch(p);
                        }}
                        className="text-[10px] font-semibold bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-emerald-400 px-3 py-1.5 border border-slate-800 rounded-lg transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Results Display List */}
                <div className="space-y-4">
                  {searchResults.length > 0 && (
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-400 font-medium">Ranked Results Catalog ({searchResults.length})</span>
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-500 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded">Semantic Similarity Map</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {searchResults.map((book) => (
                      <div
                        key={book.id}
                        className="bg-slate-900 border border-slate-900 rounded-2xl p-5 hover:border-slate-850 transition-all space-y-4 relative overflow-hidden flex flex-col justify-between"
                      >
                        {/* Match Score Indicator Badge */}
                        <div className="absolute top-5 right-5 flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Similarity</span>
                          <span className={`text-base font-black font-mono leading-none ${
                            book.relevanceScore >= 85 ? "text-emerald-400" : book.relevanceScore >= 60 ? "text-amber-400" : "text-slate-400"
                          }`}>
                            {book.relevanceScore}%
                          </span>
                        </div>

                        <div className="text-left max-w-xl">
                          <span className="inline-block text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded mb-2.5">
                            {book.subject}
                          </span>
                          <h3 className="text-base font-bold text-white tracking-tight leading-relaxed">{book.title}</h3>
                          <p className="text-xs text-indigo-300 font-medium mt-1">Author: {book.author} | Publisher: {book.publisher}</p>
                          <p className="text-xs text-slate-400 mt-2.5 leading-relaxed font-sans">{book.description}</p>
                        </div>

                        {/* Explainable AI Block */}
                        {book.aiReason && (
                          <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-slate-300 font-sans leading-relaxed">
                            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-emerald-440 block text-emerald-400 text-[10px] uppercase font-mono tracking-widest mb-1">Explainable AI Justification</span>
                              {book.aiReason}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-slate-850 flex-wrap gap-4">
                          <div className="flex space-x-2">
                            {book.keyTopics && book.keyTopics.map((topic: string, i: number) => (
                              <span key={i} className="text-[10px] font-medium bg-slate-950 text-slate-400 px-2 py-0.5 border border-slate-850 rounded">
                                {topic}
                              </span>
                            ))}
                          </div>
                          <div className="flex space-x-3 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
                            <button
                              onClick={() => loadBookInsights(book)}
                              className="text-xs text-slate-300 hover:text-white font-bold bg-slate-950 border border-slate-850 hover:bg-slate-850 px-4 py-2 rounded-xl transition-all uppercase"
                            >
                              AI Study Guide
                            </button>
                            <button
                              onClick={() => handleBorrow(book.id)}
                              className="text-xs text-slate-950 hover:bg-emerald-300 bg-emerald-400 font-black px-5 py-2 rounded-xl transition-all shadow-md uppercase"
                            >
                              Borrow Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {searchResults.length === 0 && !isSearching && (
                      <div className="text-center py-16 bg-slate-900 border border-slate-900 rounded-3xl text-slate-500">
                        <Search className="w-10 h-10 mx-auto stroke-1 text-slate-600 mb-3" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Index Ready</span>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 pl-4 leading-relaxed font-sans">
                          Type a prompt or choose any suggestion above. Standard catalogs will be analyzed and plotted instantly with deep neural models.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. VIEW TAB: KNOWLEDGE GRAPH VISUALIZATION */}
            {activeTab === "graph" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <span>Academic Flow Knowledge Graph</span>
                  </h2>
                  <p className="text-xs text-slate-400 leading-normal mt-1">
                    Visualize dependencies, authors, and subjects. Review <strong>Prerequisites</strong> (must complete first) and <strong>Anti-requisites</strong> (cannot borrow due to academic equivalence conflicts) directly before checking out textbook materials.
                  </p>
                </div>

                <KnowledgeGraph
                  books={catalog}
                  relationships={relationships}
                  onSelectBook={(id) => {
                    const book = catalog.find((b) => b.id === id);
                    if (book) loadBookInsights(book);
                  }}
                />
              </div>
            )}

            {/* 4. VIEW TAB: LEARNING PATHS ROADMAP */}
            {activeTab === "paths" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Map className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <span>Curated Roadmap Paths</span>
                  </h2>
                  <p className="text-xs text-slate-400 leading-normal mt-1">
                    Follow pre-defined, step-by-step curriculum milestones calculated straight out of the library's prerequisite logic database.
                  </p>
                </div>

                <div className="space-y-6">
                  {learningPaths.map((path) => (
                    <div key={path.id} className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <span className="inline-block text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30 mb-2">
                            {path.category} Path
                          </span>
                          <h3 className="text-base font-extrabold text-white tracking-tight lead-relaxed">{path.name}</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-xl font-medium leading-relaxed">{path.description}</p>
                        </div>
                        <span className="text-[10px] bg-slate-950 border border-slate-850 text-slate-500 font-bold uppercase tracking-widest px-2.5 py-1 rounded-xl shrink-0">
                          {path.steps.length} Milestones
                        </span>
                      </div>

                      {/* Timeline Steps Layout */}
                      <div className="space-y-4 relative pl-8 border-l-2 border-slate-800 ml-3 pt-2">
                        {path.steps.map((step) => {
                          const linkedBooks = step.bookIds.map((id) => catalog.find((b) => b.id === id)).filter(Boolean) as Book[];

                          return (
                            <div key={step.sequence} className="relative group/step">
                              {/* Step Index circular indicator */}
                              <div className="absolute left-[-42px] top-0 w-7 h-7 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-xs font-black font-mono text-emerald-400 group-hover/step:bg-emerald-500 group-hover/step:text-slate-950 transition-all shadow">
                                {step.sequence}
                              </div>

                              <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                <h4 className="text-xs font-extrabold text-white tracking-snug uppercase">{step.title}</h4>
                                <p className="text-xs text-slate-400 font-sans leading-relaxed">{step.description}</p>

                                {/* Mini textbooks shelf inside layout */}
                                <div className="pt-2 border-t border-slate-900/60 flex flex-wrap items-center gap-3">
                                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Required Reading:</span>
                                  {linkedBooks.map((book) => (
                                    <div
                                      key={book.id}
                                      onClick={() => loadBookInsights(book)}
                                      className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-850 px-3 py-1.5 border border-slate-800/80 rounded-lg text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all max-w-xs truncate"
                                    >
                                      <BookMarked className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                      <span className="truncate pr-1">{book.title}</span>
                                      <span className="text-[9px] text-slate-500 bg-slate-950 border border-slate-850 px-1 py-0.5 rounded uppercase font-bold shrink-0">{book.difficulty}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. VIEW TAB: STUDENT ACTIVE BORROWS */}
            {activeTab === "loans" && currentUser?.role === "student" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <History className="w-5 h-5 text-emerald-400" />
                    <span>My Current Active Loans</span>
                  </h2>
                  <p className="text-xs text-slate-400 leading-normal mt-1">
                    Keep track of items in your custody. You can apply for up to 2 renewals before checkout boundaries expire.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {borrowRecords
                    .filter((br) => br.userId === currentUser.id && (br.status === "borrowed" || br.status === "waitlisted"))
                    .map((br) => {
                      const book = catalog.find((b) => b.id === br.bookId);
                      const isWaitlisted = br.status === "waitlisted";
                      return (
                        <div key={br.id} className="bg-slate-900 border border-slate-900 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-850 transition-all relative">
                          {isWaitlisted && (
                            <span className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest bg-blue-950 border border-blue-900 text-blue-400 px-2.5 py-0.5 rounded-full">
                              WAITLISTED TYPE
                            </span>
                          )}

                          <div className="text-left space-y-2">
                            <span className="inline-block text-[9px] bg-slate-950 border border-slate-850 px-2 py-0.5 text-teal-400 font-bold rounded uppercase">
                              {book?.subject || "Subject Item"}
                            </span>
                            <h3 className="text-xs font-extrabold text-white tracking-tight lead-snug">{book ? book.title : "Library textbook"}</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Original checked index: {br.id}</p>
                          </div>

                          <div className="pt-4 border-t border-slate-950 mt-4 text-xs space-y-3">
                            <div className="flex justify-between items-center text-slate-400 font-medium">
                              <span>Due Date:</span>
                              <span className="font-mono text-white text-[11px] font-semibold">{formatDate(br.dueDate)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 font-medium font-sans">
                              <span>Renew Count:</span>
                              <span className="font-mono text-white">{br.renewCount} / 2</span>
                            </div>

                            <div className="flex space-x-2 pt-2">
                              {!isWaitlisted && (
                                <button
                                  onClick={() => handleRenew(br.id)}
                                  className="flex-1 bg-slate-950 hover:bg-slate-850 hover:text-white border border-slate-800 rounded-xl py-2 font-bold uppercase text-[10px] tracking-wide text-slate-300 transition-all"
                                >
                                  Renew Copy
                                </button>
                              )}
                              <button
                                onClick={() => handleReturn(br.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-xl py-2 font-black uppercase text-[10px] tracking-widest text-slate-950 hover:text-slate-950 transition-all"
                              >
                                {isWaitlisted ? "Cancel request" : "Return Log"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {borrowRecords.filter((br) => br.userId === currentUser.id && (br.status === "borrowed" || br.status === "waitlisted")).length === 0 && (
                    <div className="text-center py-12 bg-slate-900 border border-slate-900 rounded-3xl text-slate-500 col-span-1 md:col-span-2">
                      <BookOpen className="w-8 h-8 mx-auto stroke-1 text-slate-600 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Priscilla shelf empty</span>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-2 leading-relaxed">
                        Go to Semantic Search or Curated paths, find a textbook and click Borrow Copy.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. VIEW TAB: STUDENT FINE LEDGER */}
            {activeTab === "fines" && currentUser?.role === "student" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-emerald-450 text-emerald-450 text-emerald-400" />
                    <span>Fine & Settlement desk</span>
                  </h2>
                  <p className="text-xs text-slate-400 leading-normal mt-1">
                    We calculate standard late returns as: <strong>₹5/day</strong> for the first 5 days late, then <strong>₹10/day</strong>. Outstanding balances over ₹100 block textbook checkouts!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left stats cards */}
                  <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">Settlement Summary</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">Pending Fines:</span>
                      <span className="text-2xl font-black font-mono text-rose-400">₹{activeUnpaidFinesAmount}</span>
                    </div>
                    <div className="flex justify-between items-center font-sans py-2">
                      <span className="text-xs text-slate-400 font-medium">Status Limit:</span>
                      <span className={`text-[11px] font-bold font-mono uppercase px-2 py-0.5 rounded ${
                        activeUnpaidFinesAmount > 100 ? "bg-red-950 text-red-500 border border-red-900/30" : "bg-emerald-900/20 text-emerald-400 border border-emerald-9aZ"
                      }`}>
                        {activeUnpaidFinesAmount > 100 ? "BLOCKED" : "GOOD STANDING"}
                      </span>
                    </div>
                  </div>

                  {/* List of unpaid active fines */}
                  <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm md:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-850 pb-4">Overdue Records ledger</h3>
                    <div className="space-y-3">
                      {fines
                        .filter((f) => f.userId === currentUser.id && f.status === "unpaid")
                        .map((f) => {
                          const book = catalog.find((b) => b.id === f.bookId);
                          return (
                            <div key={f.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-800 transition-all flex-col sm:flex-row gap-4">
                              <div className="text-left font-sans">
                                <h4 className="text-xs font-extrabold text-white uppercase">{book ? book.title : "Library book"}</h4>
                                <p className="text-[10px] text-slate-400 mt-1">Days overdue: {f.daysOverdue} | Due: {formatDate(f.dueDate)}</p>
                              </div>
                              <div className="flex items-center space-x-4 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                                <span className="text-sm font-black font-mono text-rose-400">₹{f.fineAmount}</span>
                                <button
                                  onClick={() => handlePayFine(f.id)}
                                  className="text-[10px] font-black bg-rose-600 hover:bg-rose-500 text-slate-950 px-4 py-2 rounded-lg leading-tight uppercase shadow transition-all shrink-0 cursor-pointer"
                                >
                                  Complete Cashless Payment
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {fines.filter((f) => f.userId === currentUser.id && f.status === "unpaid").length === 0 && (
                        <div className="text-center py-8 text-slate-500 font-sans text-xs">
                          <CheckCircle className="w-7 h-7 mx-auto stroke-1 text-emerald-400 mb-2" />
                          <span>All balances pristine! No outstanding overdue fines.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- 7. VIEW TAB: ADMIN - MANAGE CATALOG (Book index listing) --- */}
            {activeTab === "admin-books" && (currentUser?.role === "admin" || currentUser?.role === "librarian") && (
              <div className="space-y-6 animate-fade-in">
                {/* Visual management header */}
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                      <span>Manage Textbook Registers</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Add, remove, or modify catalog records. Involve custom prerequisites arrays and anti-requisites blocks easily.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      resetBookForm();
                      setEditingBookId(null);
                      setShowAddForm(!showAddForm);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md uppercase flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{showAddForm ? "Close Drawer" : "Add Book Node"}</span>
                  </button>
                </div>

                {/* Adding or Editing form row */}
                {showAddForm && (
                  <form onSubmit={handleSaveBook} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-fade-in">
                    <h3 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3">
                      {editingBookId ? "Edit Textbook parameters" : "Upload New Academic textbook"}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Book Title *</label>
                        <input
                          type="text"
                          required
                          value={bookForm.title}
                          onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-550 focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Primary Author *</label>
                        <input
                          type="text"
                          required
                          value={bookForm.author}
                          onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">ISBN / Universal identifier</label>
                        <input
                          type="text"
                          value={bookForm.isbn}
                          onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-550"
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Academic Subject</label>
                        <input
                          type="text"
                          value={bookForm.subject}
                          onChange={(e) => setBookForm({ ...bookForm, subject: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Syllabus Genre</label>
                        <input
                          type="text"
                          value={bookForm.genre}
                          onChange={(e) => setBookForm({ ...bookForm, genre: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Total Copies Count</label>
                        <input
                          type="number"
                          value={bookForm.totalCopies}
                          onChange={(e) => setBookForm({ ...bookForm, totalCopies: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Knowledge Graph: Prerequisites (IDs comma separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. b1, b2"
                          value={bookForm.prerequisitesString}
                          onChange={(e) => setBookForm({ ...bookForm, prerequisitesString: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Knowledge Graph: Anti-requisites (IDs comma separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. b6, b7"
                          value={bookForm.antiRequisitesString}
                          onChange={(e) => setBookForm({ ...bookForm, antiRequisitesString: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none"
                        />
                      </div>

                      <div className="space-y-1 text-left md:col-span-2">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Textbook Abstract Summary</label>
                        <textarea
                          rows={3}
                          value={bookForm.description}
                          onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingBookId(null);
                        }}
                        className="bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs font-bold rounded-xl hover:bg-slate-850"
                      >
                        Cancel Input
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white rounded-xl hover:bg-indigo-500"
                      >
                        {editingBookId ? "Save Changes" : "Submit Record"}
                      </button>
                    </div>
                  </form>
                )}

                {/* CSV text block bulk Import drawer section */}
                <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 inline" />
                    <span>CSV Tabular bulk parser tool</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Import multiple textbooks together. Paste comma-separated text values conforming to the header segment formats:
                  </p>
                  <pre className="bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-[9px] font-mono text-slate-500 leading-snug overflow-x-auto">
                    ISBN, Title, Author, Publisher, Genre, Subject, Description, PublicationYear, TotalCopies
                  </pre>
                  <textarea
                    rows={3}
                    placeholder="e.g. 978-0131103628, The C Programming Language, Brian Kernighan, Pearson, Engineering, Programming, C Core guides, 1988, 5"
                    value={customCsv}
                    onChange={(e) => setCustomCsv(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleCsvBulkUpload}
                      className="bg-slate-950 hover:bg-slate-850 px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer"
                    >
                      Process CSV Upload
                    </button>
                  </div>
                </div>

                {/* General table grid layout */}
                <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm overflow-hidden">
                  <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-wider">Active Inventory Records</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300 divide-y divide-slate-850">
                      <thead>
                        <tr className="text-[10px] text-slate-500 uppercase tracking-widest font-black border-b border-slate-850">
                          <th className="pb-3 px-2">Book ID</th>
                          <th className="pb-3">Title / Subject</th>
                          <th className="pb-3">Author</th>
                          <th className="pb-3">Holdings Status</th>
                          <th className="pb-3 text-right pr-2">Workspace Handling</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {catalog.map((book) => (
                          <tr key={book.id} className="hover:bg-slate-955 transition-all">
                            <td className="py-3 px-2 font-mono font-bold text-slate-400">{book.id}</td>
                            <td className="py-3">
                              <span className="font-extrabold text-white block truncate max-w-xs">{book.title}</span>
                              <span className="text-[10px] text-indigo-400 font-bold block">{book.subject}</span>
                            </td>
                            <td className="py-3 font-medium text-slate-300">{book.author}</td>
                            <td className="py-3 font-mono font-semibold">
                              Available: {book.availableCopies} / {book.totalCopies}
                            </td>
                            <td className="py-3 text-right pr-2">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleEditBookClick(book)}
                                  className="p-1 px-2 border border-slate-800 rounded hover:bg-slate-800 text-indigo-400"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteBook(book.id)}
                                  className="p-1 px-2 border border-slate-800 rounded hover:bg-slate-800 text-rose-500"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- 8. VIEW TAB: ADMIN - CIRCULATION LOGS --- */}
            {activeTab === "admin-borrow" && (currentUser?.role === "admin" || currentUser?.role === "librarian") && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <History className="w-5 h-5 text-indigo-400" />
                    <span>Manage Global Circulation records</span>
                  </h2>
                  <p className="text-xs text-slate-400 leading-normal mt-1">
                    Review borrowing patterns across university student groups, approve returns, inspect deadlines state, and calculating overdue penalties.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm overflow-hidden">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-850 pb-3">Active Borrow Records</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300 divide-y divide-slate-850">
                      <thead>
                        <tr className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                          <th className="pb-3 px-2">Record ID</th>
                          <th className="pb-3">User Email</th>
                          <th className="pb-3">Book target</th>
                          <th className="pb-3">Timeline dates</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right pr-2">Approval actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {borrowRecords.map((br) => {
                          const user = dbUsers.find((u) => u.id === br.userId);
                          const book = catalog.find((b) => b.id === br.bookId);
                          const isBorrowed = br.status === "borrowed";

                          return (
                            <tr key={br.id} className="hover:bg-slate-950 transition-all">
                              <td className="py-3 px-2 font-mono font-bold text-slate-400">{br.id}</td>
                              <td className="py-3 font-sans font-medium">
                                <span className="block text-slate-200">{user?.name || "Suspended student"}</span>
                                <span className="text-[10px] text-slate-500">{user?.email || "No email"}</span>
                              </td>
                              <td className="py-3">
                                <span className="block text-slate-200 font-extrabold max-w-xs truncate">{book?.title || "Syllabus resource"}</span>
                              </td>
                              <td className="py-3 pl-1 leading-normal font-sans text-[10.5px]">
                                <span className="block text-emerald-400">Issue: {formatDate(br.issueDate)}</span>
                                <span className="block text-indigo-300">Due: {formatDate(br.dueDate)}</span>
                              </td>
                              <td className="py-3">
                                <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                                  br.status === "borrowed" ? "bg-amber-950 text-amber-400" : br.status === "returned" ? "bg-emerald-950 text-emerald-400" : "bg-blue-950 text-blue-400"
                                }`}>
                                  {br.status}
                                </span>
                              </td>
                              <td className="py-3 text-right pr-2">
                                {isBorrowed && (
                                  <button
                                    onClick={() => handleReturn(br.id)}
                                    className="text-[10px] font-bold bg-indigo-650 hover:bg-emerald-500 hover:text-slate-950 bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    Accept return
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- 9. VIEW TAB: ADMIN - STUDENT ROSTERS --- */}
            {activeTab === "admin-users" && (currentUser?.role === "admin" || currentUser?.role === "librarian") && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <span>Manage Registered Students Roster</span>
                  </h2>
                  <p className="text-xs text-slate-400 leading-normal mt-1">
                    Disable profiles, update credentials, change roles, or audit outstanding balances across the academy registration database.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-sm overflow-hidden animate-fade-in">
                  <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-wider">Account Roster</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300 divide-y divide-slate-850">
                      <thead>
                        <tr className="text-[10px] text-slate-500 tracking-widest font-black border-b border-slate-850">
                          <th className="pb-3 px-2">Student ID</th>
                          <th className="pb-3">Name / Role</th>
                          <th className="pb-3">Contact</th>
                          <th className="pb-3">Standing status</th>
                          <th className="pb-3 text-right pr-2">Auditing Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {dbUsers.map((user) => {
                          const userUnpaidFines = fines
                            .filter((f) => f.userId === user.id && f.status === "unpaid")
                            .reduce((sum, f) => sum + f.fineAmount, 0);

                          return (
                            <tr key={user.id} className="hover:bg-slate-955 transition-all">
                              <td className="py-3 px-2 font-mono font-bold text-slate-400">{user.id}</td>
                              <td className="py-3 font-sans font-medium">
                                <span className="text-white block font-extrabold">{user.name}</span>
                                <span className="text-[9px] text-indigo-400 uppercase tracking-widest font-black leading-none">{user.role}</span>
                              </td>
                              <td className="py-3 font-sans">
                                <span className="block text-slate-200">{user.email}</span>
                                <span className="block text-[10px] text-slate-500">{user.phone || "__"}</span>
                              </td>
                              <td className="py-3 leading-normal">
                                <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full inline-block ${
                                  user.status === "active" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-99" : "bg-rose-950 text-rose-500"
                                }`}>
                                  {user.status}
                                </span>
                                {userUnpaidFines > 0 && (
                                  <span className="block text-[10px] text-rose-400 font-bold font-mono mt-1">₹{userUnpaidFines} Overdue fine</span>
                                )}
                              </td>
                              <td className="py-3 text-right pr-2">
                                <button
                                  onClick={() => toggleUserSuspension(user)}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                    user.status === "active" ? "border-rose-900 hover:bg-rose-900 text-rose-400" : "border-emerald-900 hover:bg-emerald-900 text-emerald-400"
                                  }`}
                                >
                                  {user.status === "active" ? "Suspend Account" : "Activate Account"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- 10. VIEW TAB: ADMIN - EXPORT REPORTS --- */}
            {activeTab === "admin-reports" && (currentUser?.role === "admin" || currentUser?.role === "librarian") && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span>Academic Reports Engine</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Export fresh real-time database registers straight to CSV formats formatted cleanly for spreadsheet manipulations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 hover:border-slate-850 transition-all flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase mb-2">Book Inventory Report</h3>
                      <p className="text-xs text-slate-400 leading-normal">
                        Downloads complete index catalogs including ISBNs, current holdings copies, subjects groupings, and publishers metadata.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadReport("books")}
                      className="mt-6 w-full bg-indigo-650 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs tracking-wider uppercase shadow transition-all block text-center"
                    >
                      Export CSV Ledger
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 hover:border-slate-850 transition-all flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase mb-2">Student Borrowing Report</h3>
                      <p className="text-xs text-slate-400 leading-normal">
                        Downloads historical loan registers logging checking dates, overdue flags, and outstanding waitlist items.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadReport("borrowing")}
                      className="mt-6 w-full bg-indigo-650 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs tracking-wider uppercase shadow transition-all block text-center"
                    >
                      Export CSV logs
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 hover:border-slate-850 transition-all flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase mb-2">Fines Ledger Report</h3>
                      <p className="text-xs text-slate-400 leading-normal">
                        Logs monetary overdue summaries, clearance statuses, and total amount pending across student populations.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadReport("fines")}
                      className="mt-6 w-full bg-indigo-650 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs tracking-wider uppercase shadow transition-all block text-center"
                    >
                      Export CSV Fines
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5 hover:border-slate-850 transition-all flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase mb-2">Academic Users Report</h3>
                      <p className="text-xs text-slate-400 leading-normal">
                        Dumps full student registers with registration timelines, telephone metadata, and administrative verification status.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadReport("users")}
                      className="mt-6 w-full bg-indigo-650 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs tracking-wider uppercase shadow transition-all block text-center"
                    >
                      Export CSV Users
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* DETAILED BOOK POP-UP DRAWER INTERACTIVE MODAL */}
      {inspectingBook && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-left shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5 flex flex-col justify-between">
            {/* Close modal controller */}
            <button
              onClick={() => {
                setInspectingBook(null);
                setAiInsights(null);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 cursor-pointer text-xs uppercase pr-2 pl-2"
            >
              ✕ Close Dialog
            </button>

            <div>
              <span className="inline-block text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono bg-teal-950/40 px-2.0.5 rounded border border-teal-900/30 mb-2">
                {inspectingBook.subject}
              </span>
              <h3 className="text-lg font-black text-white leading-relaxed tracking-tight select-text">
                {inspectingBook.title}
              </h3>
              <p className="text-xs text-indigo-300 font-semibold mt-1">Written by {inspectingBook.author}</p>
            </div>

            {/* AI Insights Segment Loader */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-4 font-sans leading-relaxed">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Google Gemini AI Study Advisor</span>
              </h4>

              {loadingInsights ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3.5">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                  <span className="text-xs text-slate-500 font-medium font-sans">Prompting Gemini for catalog research summaries...</span>
                </div>
              ) : aiInsights ? (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Neural Abstract Summary</span>
                    <p className="text-slate-300 font-normal leading-relaxed">{aiInsights.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-y border-slate-900 py-3 mt-1 text-[11px]">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Target Skill Difficulty</span>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        aiInsights.difficulty === "Advanced" ? "bg-red-950 text-red-400" : aiInsights.difficulty === "Intermediate" ? "bg-amber-950 text-amber-400" : "bg-emerald-900 text-emerald-450"
                      }`}>
                        {aiInsights.difficulty}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Recommended Audience</span>
                      <span className="text-slate-300 font-medium block whitespace-pre-wrap leading-snug">{aiInsights.recommendedAudience}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Primary Key Topics Examined</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {aiInsights.keyTopics && aiInsights.keyTopics.map((topic: string, i: number) => (
                        <span key={i} className="bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded text-[10.5px] font-medium leading-none">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic block pl-1">Error reading core study guide.</p>
              )}
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">
                Holdings Status: <strong className="text-white font-mono">{inspectingBook.availableCopies} available</strong>
              </span>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setInspectingBook(null);
                    setAiInsights(null);
                  }}
                  className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-850 font-bold uppercase transition-all"
                >
                  Close Insights
                </button>
                <button
                  onClick={() => {
                    handleBorrow(inspectingBook.id);
                    setInspectingBook(null);
                    setAiInsights(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-5 py-2 rounded-xl transition-all uppercase leading-relaxed shadow"
                >
                  Borrow textbook
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER REGISTRATION / ACCOUNT INVITATION DIALOG MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 text-left shadow-2xl relative">
            <h3 className="text-sm font-black text-white uppercase border-b border-slate-800 pb-3 mb-4">
              Invite/Register Student Profile
            </h3>

            <form onSubmit={handleRegisterUser} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr- pr-1 select-none">Corporate Mail *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@library.com"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Telephone Contact</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 012-3456"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 pr-1 select-none">Academic Role Group</label>
                <select
                  value={regForm.role}
                  onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 outline-none"
                >
                  <option value="student">Student Account</option>
                  <option value="librarian">Librarian Account</option>
                  <option value="admin">Administrator account</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-850"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-5 py-2 rounded-xl uppercase transition-all shadow"
                >
                  Confirm Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
