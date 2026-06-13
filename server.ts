import express, { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "src", "db.json");

// Helper to interact safe with database JSON
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return {
      users: [],
      books: [],
      relationships: [],
      borrowRecords: [],
      fines: [],
      payments: [],
      notifications: [],
      learningPaths: [],
      finePolicy: {
        finePerDayBase: 5,
        finePerDayExtended: 10,
        extendedPeriodDays: 5
      }
    };
  }
}

async function writeDB(data: any) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// Instantiate Gemini API server-side securely
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to call Gemini with robust exponential backoff retries for 503 / "high demand" transient errors
let geminiPromiseChain = Promise.resolve();
let isGeminiQuotaExhausted = false;

// Helper to call Gemini with robust exponential backoff retries and serial queueing to prevent exceeding Rate Limits (5 RPM limit)
async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}, maxRetries = 2, baseDelayMs = 2500): Promise<any> {
  if (isGeminiQuotaExhausted) {
    throw new Error("Gemini daily quota limit active (switched to instant local handbook cache)");
  }
  return new Promise<any>((resolve, reject) => {
    geminiPromiseChain = geminiPromiseChain.then(async () => {
      if (isGeminiQuotaExhausted) {
        throw new Error("Gemini daily quota limit active (switched to instant local handbook cache)");
      }
      let attempt = 0;
      while (true) {
        try {
          const response = await ai.models.generateContent(params);
          // Cooldown window between consecutive model generations to respect API request spacing
          await new Promise((r) => setTimeout(r, 1200));
          return response;
        } catch (error: any) {
          attempt++;
          const errorMessage = error?.message || String(error);
          const isTransient = errorMessage.includes("503") ||
                              errorMessage.includes("500") ||
                              errorMessage.includes("429") ||
                              errorMessage.includes("UNAVAILABLE") ||
                              errorMessage.includes("high demand") ||
                              errorMessage.includes("temporary") ||
                              errorMessage.includes("Spikes in demand") ||
                              errorMessage.includes("quota") ||
                              errorMessage.includes("Quota");
          
          if (errorMessage.includes("quota") || errorMessage.includes("Quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
            isGeminiQuotaExhausted = true;
          }

          if (attempt >= maxRetries || !isTransient || isGeminiQuotaExhausted) {
            console.log(`[Gemini API] Switching to instant local handbook indices due to quota/transient status.`);
            throw new Error("Gemini API local fallback active");
          }
          
          const delay = baseDelayMs * Math.pow(2.2, attempt) + Math.random() * 600;
          console.log(`[Gemini API] Spacing next attempt by ${Math.round(delay)}ms...`);
          await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
        }
      }
    }).then(resolve).catch(reject);
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Log incoming requests for debugging in container console
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  // --- HEALTH CHECK ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // --- AUTH ENDPOINTS ---
  app.post("/api/auth/login", async (req, res) => {
    const { email } = req.body;
    const db = await readDB();
    const user = db.users.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "User not found with this email" });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ error: "Account suspended! Contact administrative desks." });
    }
    // Simple response token payload
    res.json({
      token: `mock-jwt-header.${btoa(JSON.stringify(user))}.signature`,
      user
    });
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, role, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are strictly requested" });
    }
    const db = await readDB();
    const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "Email exists already" });
    }
    const newUser = {
      id: "u" + (db.users.length + 1),
      name,
      email,
      role: role || "student",
      phone,
      registrationDate: new Date().toISOString(),
      status: "active"
    };
    db.users.push(newUser);

    // Initial sign-up notification
    db.notifications.push({
      id: "n" + (db.notifications.length + 1),
      userId: newUser.id,
      message: `Welcome, ${name}! Your student account is verified and ready.`,
      date: new Date().toISOString(),
      status: "unread",
      type: "info"
    });

    await writeDB(db);
    res.json({ user: newUser });
  });

  // --- BOOKS ENDPOINTS ---
  app.get("/api/books", async (req, res) => {
    const db = await readDB();
    res.json(db.books);
  });

  app.post("/api/books", async (req, res) => {
    const bookData = req.body;
    const db = await readDB();
    const newBook = {
      id: "b" + (db.books.length + 1),
      isbn: bookData.isbn || "ISBN-" + Math.floor(Math.random() * 100000),
      title: bookData.title,
      author: bookData.author,
      publisher: bookData.publisher || "Library Press",
      genre: bookData.genre || "Core Literature",
      subject: bookData.subject || "General",
      description: bookData.description || "",
      publicationYear: Number(bookData.publicationYear) || new Date().getFullYear(),
      totalCopies: Number(bookData.totalCopies) || 1,
      availableCopies: Number(bookData.totalCopies) || 1,
      difficulty: bookData.difficulty || "Beginner",
      keyTopics: bookData.keyTopics || [],
      recommendedAudience: bookData.recommendedAudience || "General Readers"
    };

    db.books.push(newBook);

    // Create knowledge graph connections immediately
    db.relationships.push({ source: newBook.id, target: newBook.author, type: "written_by" });
    db.relationships.push({ source: newBook.id, target: newBook.subject, type: "belongs_to" });

    if (bookData.prerequisites && Array.isArray(bookData.prerequisites)) {
      bookData.prerequisites.forEach((pId: string) => {
        db.relationships.push({ source: pId, target: newBook.id, type: "prerequisite" });
      });
    }
    if (bookData.antiRequisites && Array.isArray(bookData.antiRequisites)) {
      bookData.antiRequisites.forEach((arId: string) => {
        db.relationships.push({ source: newBook.id, target: arId, type: "anti_requisite" });
      });
    }

    await writeDB(db);
    res.json(newBook);
  });

  app.put("/api/books/:id", async (req, res) => {
    const { id } = req.params;
    const bookData = req.body;
    const db = await readDB();
    const index = db.books.findIndex((b: any) => b.id === id);
    if (index === -1) return res.status(404).json({ error: "Book not found" });

    // Keep copies calculations safe
    const oldBook = db.books[index];
    const diffCopies = (Number(bookData.totalCopies) || 1) - oldBook.totalCopies;
    const newAvailable = Math.max(0, oldBook.availableCopies + diffCopies);

    db.books[index] = {
      ...oldBook,
      ...bookData,
      totalCopies: Number(bookData.totalCopies) || 1,
      availableCopies: newAvailable
    };

    // Update connections
    db.relationships = db.relationships.filter(
      (r: any) => !(r.source === id && (r.type === "prerequisite" || r.type === "anti_requisite"))
    );
    if (bookData.prerequisites && Array.isArray(bookData.prerequisites)) {
      bookData.prerequisites.forEach((pId: string) => {
        db.relationships.push({ source: pId, target: id, type: "prerequisite" });
      });
    }
    if (bookData.antiRequisites && Array.isArray(bookData.antiRequisites)) {
      bookData.antiRequisites.forEach((arId: string) => {
        db.relationships.push({ source: id, target: arId, type: "anti_requisite" });
      });
    }

    await writeDB(db);
    res.json(db.books[index]);
  });

  app.delete("/api/books/:id", async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    db.books = db.books.filter((b: any) => b.id !== id);
    db.relationships = db.relationships.filter((r: any) => r.source !== id && r.target !== id);
    db.borrowRecords = db.borrowRecords.filter((br: any) => br.bookId !== id);
    db.fines = db.fines.filter((f: any) => f.bookId !== id);
    await writeDB(db);
    res.json({ success: true });
  });

  // CSV Book Import handler
  app.post("/api/books/csv-import", async (req, res) => {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: "No CSV elements detected" });

    const db = await readDB();
    const lines = csvData.split("\n").filter((l: string) => l.trim().length > 0);
    // Ignore header line if matching ISBN,Title,Author...
    const header = lines[0].toLowerCase();
    const listToParse = header.includes("isbn") || header.includes("title") ? lines.slice(1) : lines;

    const imported: any[] = [];
    for (const line of listToParse) {
      const parts = line.split(",").map((s: string) => s.trim().replace(/^"|"$/g, ""));
      if (parts.length < 3) continue;

      const newId = "b" + (db.books.length + 1 + imported.length);
      const newBook = {
        id: newId,
        isbn: parts[0] || "ISBN-" + Math.floor(Math.random() * 1000000),
        title: parts[1],
        author: parts[2],
        publisher: parts[3] || "Import Press",
        genre: parts[4] || "Core Technical",
        subject: parts[5] || "Informatics",
        description: parts[6] || `Imported record for ${parts[1]}.`,
        publicationYear: Number(parts[7]) || new Date().getFullYear(),
        totalCopies: Number(parts[8]) || 5,
        availableCopies: Number(parts[8]) || 5,
        difficulty: "Beginner",
        keyTopics: [parts[5] || "Fundamentals"],
        recommendedAudience: "Academic Students"
      };

      db.books.push(newBook);
      db.relationships.push({ source: newId, target: newBook.author, type: "written_by" });
      db.relationships.push({ source: newId, target: newBook.subject, type: "belongs_to" });
      imported.push(newBook);
    }

    await writeDB(db);
    res.json({ success: true, count: imported.length, books: imported });
  });

  // --- USERS ENDPOINTS ---
  app.get("/api/users", async (req, res) => {
    const db = await readDB();
    res.json(db.users);
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { name, phone, status, role } = req.body;
    const db = await readDB();
    const userIndex = db.users.findIndex((u: any) => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: "User profile not found" });

    db.users[userIndex] = {
      ...db.users[userIndex],
      ...(name && { name }),
      ...(phone && { phone }),
      ...(status && { status }),
      ...(role && { role })
    };

    await writeDB(db);
    res.json(db.users[userIndex]);
  });

  // --- BORROW RECORDS ENDPOINTS ---
  app.get("/api/borrow", async (req, res) => {
    const db = await readDB();
    res.json(db.borrowRecords);
  });

  // Check out standard loan (Borrow, Reserve, Renew)
  app.post("/api/borrow/checkout", async (req, res) => {
    const { userId, bookId } = req.body;
    const db = await readDB();

    const user = db.users.find((u: any) => u.id === userId);
    if (!user) return res.status(404).json({ error: "User profile not registered" });

    const book = db.books.find((b: any) => b.id === bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });

    // 1. Core Rule Check: Check prerequisites
    const unmetPrereqs: string[] = [];
    db.relationships
      .filter((r: any) => r.target === bookId && r.type === "prerequisite")
      .forEach((r: any) => {
        // Did the user returned this prerequisite book in past?
        const finished = db.borrowRecords.some(
          (br: any) => br.userId === userId && br.bookId === r.source && br.status === "returned"
        );
        if (!finished) {
          const prereqBook = db.books.find((b: any) => b.id === r.source);
          unmetPrereqs.push(prereqBook ? prereqBook.title : r.source);
        }
      });

    if (unmetPrereqs.length > 0) {
      return res.status(400).json({
        rulesCheckFailed: true,
        type: "prerequisite",
        message: `Prerequisite Blocked: You must read and return the following books first: ${unmetPrereqs.join(", ")}`
      });
    }

    // 2. Core Rule Check: Check anti-requisites
    const activeAntiReqs: string[] = [];
    db.relationships
      .filter((r: any) => (r.source === bookId || r.target === bookId) && r.type === "anti_requisite")
      .forEach((r: any) => {
        const otherBookId = r.source === bookId ? r.target : r.source;
        // Check if user currently holds or holds history for equivalent book
        const holds = db.borrowRecords.some(
          (br: any) => br.userId === userId && br.bookId === otherBookId && br.status === "borrowed"
        );
        if (holds) {
          const equivalentBook = db.books.find((b: any) => b.id === otherBookId);
          activeAntiReqs.push(equivalentBook ? equivalentBook.title : otherBookId);
        }
      });

    if (activeAntiReqs.length > 0) {
      return res.status(400).json({
        rulesCheckFailed: true,
        type: "anti_requisite",
        message: `Anti-requisite Conflict: You cannot check out '${book.title}' because you are currently borrowing a conflicting level/equivalent book: ${activeAntiReqs.join(", ")}`
      });
    }

    // Check outstanding unpaid fines
    const userFines = db.fines.filter((f: any) => f.userId === userId && f.status === "unpaid");
    const totalFines = userFines.reduce((sum: number, f: any) => sum + f.fineAmount, 0);
    if (totalFines > 100) {
      return res.status(400).json({
        error: `Checkout Blocked: You have ₹${totalFines} outstanding fines. Please pay fines down below ₹100 first.`
      });
    }

    const currentBorrowCount = db.borrowRecords.filter(
      (br: any) => br.userId === userId && br.status === "borrowed"
    ).length;
    if (currentBorrowCount >= 3) {
      return res.status(400).json({
        error: "Checkout Blocked: Maximum check out limit of 3 active books met."
      });
    }

    // Check copies availability
    if (book.availableCopies <= 0) {
      // Put on waitlist
      const newWaitId = "br" + (db.borrowRecords.length + 1);
      const newWait = {
        id: newWaitId,
        userId,
        bookId,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        renewCount: 0,
        status: "waitlisted"
      };
      db.borrowRecords.push(newWait);
      db.notifications.push({
        id: "n" + (db.notifications.length + 1),
        userId,
        message: `Copies depletion: You are waitlisted for '${book.title}'.`,
        date: new Date().toISOString(),
        status: "unread",
        type: "info"
      });
      await writeDB(db);
      return res.json({ success: true, status: "waitlisted", record: newWait });
    }

    // Success borrow
    book.availableCopies -= 1;
    const newBorrowId = "br" + (db.borrowRecords.length + 1);
    const newRecord = {
      id: newBorrowId,
      userId,
      bookId,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 Days
      renewCount: 0,
      status: "borrowed"
    };

    db.borrowRecords.push(newRecord);
    db.notifications.push({
      id: "n" + (db.notifications.length + 1),
      userId,
      message: `Checked out successfully: '${book.title}'. Return before strict due date: ${new Date(newRecord.dueDate).toLocaleDateString()}.`,
      date: new Date().toISOString(),
      status: "unread",
      type: "loan"
    });

    await writeDB(db);
    res.json({ success: true, status: "borrowed", record: newRecord });
  });

  // Return book
  app.post("/api/borrow/return", async (req, res) => {
    const { borrowId } = req.body;
    const db = await readDB();

    const record = db.borrowRecords.find((br: any) => br.id === borrowId);
    if (!record) return res.status(404).json({ error: "Borrow record not found" });
    if (record.status !== "borrowed") return res.status(400).json({ error: "Book is not currently on loan" });

    const book = db.books.find((b: any) => b.id === record.bookId);
    if (book) {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
    }

    record.status = "returned";
    record.returnDate = new Date().toISOString();

    // Check if overdue to calculate fines
    const dueTime = new Date(record.dueDate).getTime();
    const returnTime = new Date(record.returnDate).getTime();

    if (returnTime > dueTime) {
      const daysOverdue = Math.ceil((returnTime - dueTime) / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        // Fine policy calculation
        const base = db.finePolicy.finePerDayBase;
        const ext = db.finePolicy.finePerDayExtended;
        const border = db.finePolicy.extendedPeriodDays;

        let fee = 0;
        if (daysOverdue <= border) {
          fee = daysOverdue * base;
        } else {
          fee = (border * base) + ((daysOverdue - border) * ext);
        }

        const newFine = {
          id: "f" + (db.fines.length + 1),
          userId: record.userId,
          bookId: record.bookId,
          borrowId: record.id,
          dueDate: record.dueDate,
          returnDate: record.returnDate,
          daysOverdue,
          fineAmount: fee,
          status: "unpaid"
        };
        db.fines.push(newFine);

        db.notifications.push({
          id: "n" + (db.notifications.length + 1),
          userId: record.userId,
          message: `Overdue Return: Outstanding fine of ₹${fee} issued for keeping ${book?.title || "book"} ${daysOverdue} days late.`,
          date: new Date().toISOString(),
          status: "unread",
          type: "fine"
        });
      }
    } else {
      db.notifications.push({
        id: "n" + (db.notifications.length + 1),
        userId: record.userId,
        message: `Returned successfully: '${book?.title}'. Thank you for supporting the library timeline!`,
        date: new Date().toISOString(),
        status: "unread",
        type: "loan"
      });
    }

    // If waitlisted accounts exist, automatically move the first one up
    const nextInLine = db.borrowRecords.find(
      (br: any) => br.bookId === record.bookId && br.status === "waitlisted"
    );
    if (nextInLine && book && book.availableCopies > 0) {
      book.availableCopies -= 1;
      nextInLine.status = "borrowed";
      nextInLine.issueDate = new Date().toISOString();
      nextInLine.dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      db.notifications.push({
        id: "n" + (db.notifications.length + 1),
        userId: nextInLine.userId,
        message: `Waitlist update: '${book.title}' is available! Automatically checked out for you. Due ${new Date(nextInLine.dueDate).toLocaleDateString()}.`,
        date: new Date().toISOString(),
        status: "unread",
        type: "loan"
      });
    }

    await writeDB(db);
    res.json({ success: true, record });
  });

  // Renew book
  app.post("/api/borrow/renew", async (req, res) => {
    const { borrowId } = req.body;
    const db = await readDB();

    const record = db.borrowRecords.find((br: any) => br.id === borrowId);
    if (!record) return res.status(404).json({ error: "Borrow record not found" });
    if (record.status !== "borrowed") return res.status(400).json({ error: "Cannot renew. Book is not checked out" });

    if (record.renewCount >= 2) {
      return res.status(400).json({ error: "Fail: Maximum renewal limit (2 times) reached." });
    }

    // Verify nobody else is waitlisted for this book
    const isReserved = db.borrowRecords.some((br: any) => br.bookId === record.bookId && br.status === "waitlisted");
    if (isReserved) {
      return res.status(400).json({ error: "Renewal blocked: Another user has waitlisted this book." });
    }

    // Extend due date by 7 days
    const currentDue = new Date(record.dueDate).getTime();
    record.dueDate = new Date(currentDue + 7 * 24 * 60 * 60 * 1000).toISOString();
    record.renewCount += 1;

    db.notifications.push({
      id: "n" + (db.notifications.length + 1),
      userId: record.userId,
      message: `Renewal success: Extended '${db.books.find((b: any) => b.id === record.bookId)?.title}' due date to ${new Date(record.dueDate).toLocaleDateString()}.`,
      date: new Date().toISOString(),
      status: "unread",
      type: "loan"
    });

    await writeDB(db);
    res.json({ success: true, record });
  });

  // --- FINES AND PAYMENTS ENDPOINTS ---
  app.get("/api/fines", async (req, res) => {
    const db = await readDB();
    res.json(db.fines);
  });

  app.post("/api/fines/pay", async (req, res) => {
    const { fineId } = req.body;
    const db = await readDB();

    const fine = db.fines.find((f: any) => f.id === fineId);
    if (!fine) return res.status(404).json({ error: "Fine record not found" });
    if (fine.status === "paid") return res.status(400).json({ error: "Fine is already fully cleared" });

    fine.status = "paid";
    const transactionId = "TXN-" + Math.floor(Math.random() * 1000000000);
    const newPayment = {
      id: "p" + (db.payments.length + 1),
      fineId,
      userId: fine.userId,
      transactionId,
      amount: fine.fineAmount,
      paymentDate: new Date().toISOString()
    };
    db.payments.push(newPayment);

    db.notifications.push({
      id: "n" + (db.notifications.length + 1),
      userId: fine.userId,
      message: `Cleared: Fine of ₹${fine.fineAmount} paid successfully. Receipt number: ${transactionId}.`,
      date: new Date().toISOString(),
      status: "unread",
      type: "fine"
    });

    await writeDB(db);
    res.json({ success: true, payment: newPayment });
  });

  app.get("/api/payments", async (req, res) => {
    const db = await readDB();
    res.json(db.payments);
  });

  // --- NOTIFICATIONS ENDPOINTS ---
  app.get("/api/notifications/:userId", async (req, res) => {
    const { userId } = req.params;
    const db = await readDB();
    const userNotifs = db.notifications.filter((n: any) => n.userId === userId);
    res.json(userNotifs);
  });

  app.post("/api/notifications/read", async (req, res) => {
    const { notificationId } = req.body;
    const db = await readDB();
    const notif = db.notifications.find((n: any) => n.id === notificationId);
    if (notif) {
      notif.status = "read";
    }
    await writeDB(db);
    res.json({ success: true });
  });

  // --- KNOWLEDGE GRAPH ENDPOINTS ---
  app.get("/api/graph", async (req, res) => {
    const db = await readDB();
    res.json({
      books: db.books,
      relationships: db.relationships
    });
  });

  app.post("/api/graph/relationships", async (req, res) => {
    const { source, target, type } = req.body;
    if (!source || !target || !type) {
      return res.status(400).json({ error: "Source, target, and type are requested" });
    }
    const db = await readDB();
    db.relationships.push({ source, target, type });
    await writeDB(db);
    res.json({ success: true });
  });

  // --- LEARNING PATHS ENDPOINTS ---
  app.get("/api/learning-paths", async (req, res) => {
    const db = await readDB();
    res.json(db.learningPaths);
  });

  // --- EXPLAINABLE AI SEMANTIC SEARCH WITH GEMINI ---
  app.post("/api/search/semantic", async (req, res) => {
    const { query } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query is empty" });
    }

    const db = await readDB();
    // Prepare the catalog details to guide Gemini search mapping
    const catalogBrief = db.books.map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      genre: b.genre,
      subject: b.subject,
      difficulty: b.difficulty || "Intermediate",
      keyTopics: b.keyTopics || [],
      description: b.description
    }));

    const systemPrompt = `You are the core AI retrieval mapping engine of an Advanced Library Management System.
The system features a catalog of technical books. The user has inputted a natural language search query.
Your job is to read the query, understand its semantic core, rank ALL available books in the inventory by relevance (0 to 100), and write targeted explanations ("Explainable AI") of why it fits.

Only return a clean JSON array (no markdown code blocks, no trailing comments, no text before or after).
The schema must exactly be an array of objects:
[
  {
    "bookId": "string",
    "relevanceScore": number, // 0 to 100
    "reason": "Explainable AI justification: How this specific book serves their query and where it sits in their skill level",
    "similarBooks": ["array of similar book ids"]
  }
]

Current Library Catalog:
${JSON.stringify(catalogBrief, null, 2)}

User Search Query:
"${query}"`;

    try {
      console.log(`Calling Gemini 'gemini-3.5-flash' for Semantic Search on: "${query}"`);
      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const rawText = response.text || "[]";
      console.log("Gemini raw search response achieved.");
      const searchResults = JSON.parse(rawText.trim());

      // Merge Gemini analytics back with actual full book objects
      const finalResults = searchResults
        .map((sr: any) => {
          const book = db.books.find((b: any) => b.id === sr.bookId);
          if (!book) return null;
          return {
            ...book,
            relevanceScore: sr.relevanceScore,
            aiReason: sr.reason,
            similarBooks: sr.similarBooks || []
          };
        })
        .filter(Boolean)
        // Sort by score descending
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

      res.json(finalResults);
    } catch (err: any) {
      console.log("Gemini Semantic Search Fallback Protocol Activated (API Key rate-limited or busy):", err?.message || err);
      // Fallback local keyword search in case Gemini API is missing or crashes
      const cleanq = query.toLowerCase();
      const fallback = db.books.map((b: any) => {
        let score = 0;
        if (b.title.toLowerCase().includes(cleanq)) score += 40;
        if (b.description.toLowerCase().includes(cleanq)) score += 20;
        if (b.author.toLowerCase().includes(cleanq)) score += 15;
        if (b.subject.toLowerCase().includes(cleanq)) score += 15;
        if (b.genre.toLowerCase().includes(cleanq)) score += 10;

        return {
          ...b,
          relevanceScore: score > 0 ? Math.min(score + 30, 95) : 10,
          aiReason: score > 0 ? `Matched keywords on '${cleanq}'. (Semantic LLM service went to offline fallback mode)` : "Weak semantic match with user interest keywords.",
          similarBooks: []
        };
      }).sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

      res.json(fallback);
    }
  });

  // --- HYBRID AI RECOMMENDATION SYSTEM ---
  app.get("/api/recommendations", async (req, res) => {
    const userId = req.query.userId as string;
    const db = await readDB();

    if (!userId) {
      // Return general recommendations
      return res.json({
        contentBased: db.books.slice(0, 2),
        graphBased: db.books.slice(2, 4),
        hybrid: db.books.slice(0, 3)
      });
    }

    const userHistory = db.borrowRecords.filter(
      (br: any) => br.userId === userId && (br.status === "borrowed" || br.status === "returned")
    );

    // If user has zero borrowing history, fallback to standard curated recommendations
    if (userHistory.length === 0) {
      return res.json({
        contentBased: [
          { ...db.books[0], relevance: 85, reason: "Excellent beginner blueprint start for standard programmatic literacy." },
          { ...db.books[1], relevance: 80, reason: "Widely selected first-choice handbook for starting tabular database computations." }
        ],
        graphBased: [
          { ...db.books[2], relevance: 75, reason: "Sits as the standard core sequel for completed Python foundational books." }
        ],
        hybrid: [
          { ...db.books[5], relevance: 90, reason: "Clean Code is highly recommended across all student registers as an industry baseline." }
        ]
      });
    }

    try {
      const historyTitles = userHistory.map((h: any) => {
        const book = db.books.find((b: any) => b.id === h.bookId);
        return book ? `${book.title} (Subject: ${book.subject}, Genre: ${book.genre})` : "Unknown book";
      });

      const catalogBrief = db.books.map((b: any) => ({
        id: b.id,
        title: b.title,
        genre: b.genre,
        subject: b.subject,
        difficulty: b.difficulty
      }));

      // Involve Knowledge Graph connections
      const graphEdgesBrief = db.relationships.map((r: any) => ({
        source: r.source,
        target: r.target,
        type: r.type
      }));

      const systemPrompt = `You are an expert Recommendation Engine inside a technical university library.
We maintain active knowledge graph loops showing subjects, prerequisites, and anti-requisites.
A student seeks intelligent recommendations. Analyze their history and the graph to build three customized response rows:
1. Content-Based recommendations (based on textual/difficulty similarities).
2. Knowledge Graph-Based recommendations (following prerequisites, topics, authors, and preventing anti-requisites conflicts).
3. Hybrid recommendations (a deep blending of both mechanisms).

Format the output strictly as a JSON object containing:
{
  "contentBased": [{"id": "b1", "score": 90, "reason": "Because you read... this shares..."}],
  "graphBased": [{"id": "b3", "score": 85, "reason": "Serves as the next prerequisite stage after..."}],
  "hybrid": [{"id": "b5", "score": 95, "reason": "Matches both your interest in... and connects..."}]
}

Let your suggestions be highly explainable, descriptive, and clear. Avoid suggestions of books the user already borrowed in their history.

Student Borrowing History:
${historyTitles.join("\n")}

Available Book Catalog:
${JSON.stringify(catalogBrief, null, 2)}

Knowledge Graph Edges:
${JSON.stringify(graphEdgesBrief, null, 2)}`;

      console.log("Calling Gemini for user-specific Hybrid Recommendations...");
      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const results = JSON.parse((response.text || "{}").trim());

      const mapResult = (list: any[]) => {
        if (!list || !Array.isArray(list)) return [];
        return list.map((item: any) => {
          const book = db.books.find((b: any) => b.id === item.id);
          if (!book) return null;
          return {
            ...book,
            relevanceScore: item.score || 80,
            aiReason: item.reason || "Recommended based on your library interactions."
          };
        }).filter(Boolean);
      };

      res.json({
        contentBased: mapResult(results.contentBased),
        graphBased: mapResult(results.graphBased),
        hybrid: mapResult(results.hybrid)
      });
    } catch (err: any) {
      console.log("Gemini Recommendations Fallback Protocol Activated (API Key rate-limited or busy):", err?.message || err);
      
      const userBookIds = new Set(userHistory.map((h: any) => h.bookId));
      const userSubjects = new Set<string>();
      const userGenres = new Set<string>();
      
      for (const rec of userHistory) {
        const book = db.books.find((b: any) => b.id === rec.bookId);
        if (book) {
          if (book.subject) userSubjects.add(book.subject);
          if (book.genre) userGenres.add(book.genre);
        }
      }
      
      const unborrowedBooks = db.books.filter((b: any) => !userBookIds.has(b.id));
      const pool = unborrowedBooks.length > 0 ? unborrowedBooks : db.books;
      
      // Heuristic Content-based Match
      const contentMatches = pool.filter((b: any) => userSubjects.has(b.subject) || userGenres.has(b.genre));
      const contentBased = (contentMatches.length > 0 ? contentMatches : pool)
        .slice(0, 3)
        .map((b: any, idx) => ({
          ...b,
          relevanceScore: 90 - idx * 4,
          aiReason: `Matches your previous interest in ${b.subject || b.genre}. (Local hybrid fallback)`
        }));
        
      // Heuristic Graph-based Match
      const graphMatches: any[] = [];
      for (const b of pool) {
        const isConnected = db.relationships.some((r: any) => 
          (r.source === b.id && userBookIds.has(r.target)) ||
          (r.target === b.id && userBookIds.has(r.source))
        );
        if (isConnected) {
          graphMatches.push(b);
        }
      }
      const graphBased = (graphMatches.length > 0 ? graphMatches : pool.slice().reverse())
        .slice(0, 3)
        .map((b: any, idx) => ({
          ...b,
          relevanceScore: 85 - idx * 5,
          aiReason: `Linked sequentially in your course research prerequisite tracks.`
        }));
        
      // Heuristic Hybrid Match
      const hybrid = pool
        .slice(0, 3)
        .map((b: any, idx) => ({
          ...b,
          relevanceScore: 92 - idx * 3,
          aiReason: `Ranked cross-discipline choice in the university syllabus guide.`
        }));

      res.json({ contentBased, graphBased, hybrid });
    }
  });

  // --- AI BOOK INSIGHTS ---
  app.get("/api/insights/:bookId", async (req, res) => {
    const { bookId } = req.params;
    const db = await readDB();
    const book = db.books.find((b: any) => b.id === bookId);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    try {
      const prompt = `Develop deep AI analytical insights for the following technical textbook. 
Your output must fit a student reading agenda. Include clear, concise summaries, target skill difficulty mapping, list of vital technical domains, and ideal professional audience.

Output must be brief structure JSON:
{
  "summary": "Full overview summary",
  "difficulty": "Beginner | Intermediate | Advanced",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "recommendedAudience": "Who strictly yields the most advantage from this handbook"
}

Book Details:
Title: ${book.title}
Author: ${book.author}
Subject: ${book.subject}
Description: ${book.description}
Key topics available so far: ${JSON.stringify(book.keyTopics)}`;

      console.log(`Generating AI insights for book: ${book.title}`);
      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const insights = JSON.parse((response.text || "{}").trim());
      res.json(insights);
    } catch (err: any) {
      console.log("Gemini AI Insights Fallback Protocol Activated (API Key rate-limited or busy):", err?.message || err);
      res.json({
        summary: book.summary || book.description,
        difficulty: book.difficulty || "Beginner",
        keyTopics: book.keyTopics || [book.subject],
        recommendedAudience: book.recommendedAudience || "General Student Register"
      });
    }
  });

  // --- REPORT EXPORT ENGINE (CSV builder) ---
  app.get("/api/reports/:type", async (req, res) => {
    const { type } = req.params;
    const db = await readDB();

    let csvContent = "";
    let fileName = `report_${type}_${Date.now()}.csv`;

    if (type === "books") {
      csvContent = "BookID,ISBN,Title,Author,Subject,Genre,TotalCopies,AvailableCopies\n";
      db.books.forEach((b: any) => {
        csvContent += `"${b.id}","${b.isbn}","${b.title.replace(/"/g, '""')}","${b.author.replace(/"/g, '""')}","${b.subject}","${b.genre}",${b.totalCopies},${b.availableCopies}\n`;
      });
    } else if (type === "borrowing") {
      csvContent = "BorrowID,UserID,BookID,IssueDate,DueDate,ReturnDate,Status\n";
      db.borrowRecords.forEach((br: any) => {
        csvContent += `"${br.id}","${br.userId}","${br.bookId}","${br.issueDate}","${br.dueDate}","${br.returnDate || ''}","${br.status}"\n`;
      });
    } else if (type === "fines") {
      csvContent = "FineID,UserID,BookID,OverdueDays,Amount,Status\n";
      db.fines.forEach((f: any) => {
        csvContent += `"${f.id}","${f.userId}","${f.bookId}",${f.daysOverdue},${f.fineAmount},"${f.status}"\n`;
      });
    } else if (type === "users") {
      csvContent = "UserID,Name,Email,Role,RegisteredDate,Status\n";
      db.users.forEach((u: any) => {
        csvContent += `"${u.id}","${u.name.replace(/"/g, '""')}","${u.email}","${u.role}","${u.registrationDate}","${u.status}"\n`;
      });
    } else {
      return res.status(400).json({ error: "Invalid report register requested" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(csvContent);
  });


  // --- VITE DEV / PRODUCTION INTEGRATION ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
