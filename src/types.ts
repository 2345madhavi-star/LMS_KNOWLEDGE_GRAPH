export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'librarian' | 'admin';
  phone?: string;
  registrationDate: string;
  status: 'active' | 'suspended';
}

export interface Book {
  id: string; // ISBN or standard ID
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  genre: string;
  subject: string;
  description: string;
  publicationYear: number;
  totalCopies: number;
  availableCopies: number;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  keyTopics?: string[];
  recommendedAudience?: string;
  summary?: string;
}

export interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  renewCount: number;
  status: 'borrowed' | 'returned' | 'reserved' | 'waitlisted';
}

export interface Fine {
  id: string;
  userId: string;
  bookId: string;
  borrowId: string;
  dueDate: string;
  returnDate?: string;
  daysOverdue: number;
  fineAmount: number;
  status: 'unpaid' | 'paid';
}

export interface Payment {
  id: string;
  fineId: string;
  userId: string;
  transactionId: string;
  amount: number;
  paymentDate: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  date: string;
  status: 'unread' | 'read';
  type?: 'info' | 'loan' | 'fine' | 'recommendation';
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'book' | 'author' | 'subject' | 'genre' | 'topic';
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'written_by' | 'related_to' | 'belongs_to' | 'recommended_with' | 'prerequisite' | 'anti_requisite';
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: {
    sequence: number;
    title: string;
    description: string;
    bookIds: string[];
  }[];
}
