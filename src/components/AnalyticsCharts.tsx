import React, { useState } from "react";
import { Book, BorrowRecord, Fine, Payment } from "../types";

interface AnalyticsProps {
  books: Book[];
  borrowRecords: BorrowRecord[];
  fines: Fine[];
  payments: Payment[];
}

export default function AnalyticsCharts({ books, borrowRecords, fines, payments }: AnalyticsProps) {
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  // 1. Data Prep: Books by Genre
  const genreCounts: { [key: string]: number } = {};
  books.forEach((b) => {
    genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
  });
  const genreData = Object.entries(genreCounts).map(([name, value]) => ({ name, value }));
  const maxGenreVal = Math.max(...genreData.map((d) => d.value), 1);

  // 2. Data Prep: Borrow status Ratios
  const statusCounts = {
    borrowed: borrowRecords.filter((r) => r.status === "borrowed").length,
    returned: borrowRecords.filter((r) => r.status === "returned").length,
    waitlisted: borrowRecords.filter((r) => r.status === "waitlisted").length,
  };
  const totalLoans = Math.max(borrowRecords.length, 1);
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
    percentage: Math.round((value / totalLoans) * 100)
  }));

  // 3. Data Prep: Fine Collections
  const totalFinesCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingFines = fines.filter((f) => f.status === "unpaid").reduce((sum, f) => sum + f.fineAmount, 0);

  // Hardcoded historical collections trend
  const monthlyTrends = [
    { month: "Jan", loan: 8, cleared: 15 },
    { month: "Feb", loan: 12, cleared: 40 },
    { month: "Mar", loan: 18, cleared: 30 },
    { month: "Apr", loan: 22, cleared: 80 },
    { month: "May", loan: 35, cleared: 110 },
    { month: "Jun", loan: borrowRecords.length, cleared: totalFinesCollected },
  ];
  const maxTrendVal = Math.max(...monthlyTrends.map((t) => Math.max(t.loan, t.cleared)), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Books Count by Genre (Custom Interactive Bar Chart) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-800 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase mb-1">Books Stock</h3>
          <h4 className="text-lg font-black font-sans text-slate-900 mb-6">Distribution by Genre</h4>
        </div>
        <div className="space-y-4">
          {genreData.map((d) => {
            const barWidth = `${(d.value / maxGenreVal) * 100}%`;
            const isHovered = hoveredGenre === d.name;
            return (
              <div
                key={d.name}
                className="space-y-1.5 cursor-pointer group"
                onMouseEnter={() => setHoveredGenre(d.name)}
                onMouseLeave={() => setHoveredGenre(null)}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-bold ${isHovered ? "text-blue-600" : "text-slate-700"} transition-colors`}>
                    {d.name}
                  </span>
                  <span className="font-mono text-slate-500 font-bold group-hover:text-blue-600">
                    {d.value} {d.value === 1 ? "book" : "books"}
                  </span>
                </div>
                <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 transition-all duration-500 ease-out`}
                    style={{ width: barWidth }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-450 font-semibold">
          <span>Total catalog segments: {genreData.length}</span>
          <span>Click categories inside list to map</span>
        </div>
      </div>

      {/* Chart 2: Borrow Status Ratios (Custom Interactive Donut Chart Representation) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-800 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase mb-1">Loan Flow</h3>
          <h4 className="text-lg font-black font-sans text-slate-900 mb-6">Borrow Status Analysis</h4>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2">
          {/* Custom SVG Donut Chart */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="10"
              />
              {/* Borrowed Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#f59e0b"
                strokeWidth="10"
                strokeDasharray={`${(statusCounts.borrowed / totalLoans) * 251.2} 251.2`}
                strokeDashoffset="0"
                className="transition-all duration-1000 ease-in-out cursor-pointer"
                onMouseEnter={() => setHoveredStatus("borrowed")}
                onMouseLeave={() => setHoveredStatus(null)}
              />
              {/* Returned Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="10"
                strokeDasharray={`${(statusCounts.returned / totalLoans) * 251.2} 251.2`}
                strokeDashoffset={`-${(statusCounts.borrowed / totalLoans) * 251.2}`}
                className="transition-all duration-1000 ease-in-out cursor-pointer"
                onMouseEnter={() => setHoveredStatus("returned")}
                onMouseLeave={() => setHoveredStatus(null)}
              />
              {/* Waitlisted Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#3b82f6"
                strokeWidth="10"
                strokeDasharray={`${(statusCounts.waitlisted / totalLoans) * 251.2} 251.2`}
                strokeDashoffset={`-${((statusCounts.borrowed + statusCounts.returned) / totalLoans) * 251.2}`}
                className="transition-all duration-1000 ease-in-out cursor-pointer"
                onMouseEnter={() => setHoveredStatus("waitlisted")}
                onMouseLeave={() => setHoveredStatus(null)}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black font-mono text-slate-800">
                {borrowRecords.length}
              </span>
              <span className="text-[10px] text-slate-450 uppercase tracking-widest font-black">
                Records
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            {statusData.map((st) => {
              const colors: { [key: string]: string } = {
                BORROWED: "bg-amber-500",
                RETURNED: "bg-emerald-500",
                WAITLISTED: "bg-blue-500",
              };
              const textColors: { [key: string]: string } = {
                BORROWED: "text-amber-600",
                RETURNED: "text-emerald-600",
                WAITLISTED: "text-blue-600",
              };
              const isHovered = hoveredStatus === st.name.toLowerCase();
              return (
                <div
                  key={st.name}
                  className={`flex items-center space-x-3 p-2 rounded-xl transition-all ${
                    isHovered ? "bg-slate-50 pl-3" : ""
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${colors[st.name]}`} />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-700">{st.name}</span>
                    <span className={`ml-2 font-mono text-[10px] ${textColors[st.name]} font-black`}>
                      {st.percentage}%
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500 font-bold">{st.value}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-450 font-bold">
          <span>Unpaid Fines Issued: ₹{pendingFines}</span>
          <span>Fines Collected: ₹{totalFinesCollected}</span>
        </div>
      </div>

      {/* Chart 3: Fine Collection & Overdue Trends (Line representation) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-800 col-span-1 lg:col-span-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase mb-1">Time Analysis</h3>
            <h4 className="text-lg font-black font-sans text-slate-900">Monthly Circulation & Fine Recovery</h4>
          </div>
          <div className="flex space-x-6 text-xs font-bold text-slate-500">
            <span className="flex items-center space-x-2">
              <span className="w-3.5 h-1.5 bg-blue-500 rounded-full inline-block" />
              <span>Active Borrowings</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="w-3.5 h-1.5 bg-amber-500 rounded-full inline-block" />
              <span>Payments Collected (₹)</span>
            </span>
          </div>
        </div>

        {/* Custom SVG Line and Area Chart */}
        <div className="relative w-full h-56 pt-2 select-none">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
            {/* Horizontal Grid Lines */}
            <line x1="0" y1="0" x2="600" y2="0" stroke="#f1f5f9" strokeDasharray="4,4" />
            <line x1="0" y1="50" x2="600" y2="50" stroke="#f1f5f9" strokeDasharray="4,4" />
            <line x1="0" y1="100" x2="600" y2="100" stroke="#f1f5f9" strokeDasharray="4,4" />
            <line x1="0" y1="150" x2="600" y2="150" stroke="#f1f5f9" strokeDasharray="4,4" />
            <line x1="0" y1="200" x2="600" y2="200" stroke="#cbd5e1" />

            {/* Render Area/Path for Active Borrowings Line (Blue) */}
            <path
              d={monthlyTrends
                .map((t, idx) => {
                  const x = (idx / (monthlyTrends.length - 1)) * 600;
                  // Map data into 0-180 graph heights (flipped y axis)
                  const y = 200 - (t.loan / maxTrendVal) * 160 - 10;
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Render Area/Path for Cleared Fines Line (Gold) */}
            <path
              d={monthlyTrends
                .map((t, idx) => {
                  const x = (idx / (monthlyTrends.length - 1)) * 600;
                  const y = 200 - (t.cleared / maxTrendVal) * 160 - 10;
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Render data dot hotspots */}
            {monthlyTrends.map((t, idx) => {
              const x = (idx / (monthlyTrends.length - 1)) * 600;
              const y1 = 200 - (t.loan / maxTrendVal) * 160 - 10;
              const y2 = 200 - (t.cleared / maxTrendVal) * 160 - 10;
              return (
                <g key={idx}>
                  {/* Blue circle */}
                  <circle cx={x} cy={y1} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2.5" className="cursor-pointer hover:r-7 transition-all" />
                  {/* Gold circle */}
                  <circle cx={x} cy={y2} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" className="cursor-pointer hover:r-7 transition-all" />
                </g>
              );
            })}
          </svg>

          {/* Month labels bottom */}
          <div className="absolute left-0 right-0 bottom-[-24px] flex justify-between px-1 text-[10px] text-slate-500 font-bold tracking-widest font-mono uppercase">
            {monthlyTrends.map((t) => (
              <span key={t.month}>{t.month}</span>
            ))}
          </div>

          {/* Side Axis Indicators */}
          <div className="absolute top-0 left-[-16px] bottom-0 flex flex-col justify-between text-[10px] text-slate-400 font-semibold font-mono pointer-events-none">
            <span>Peak</span>
            <span>Mid</span>
            <span>Base</span>
          </div>
        </div>
      </div>
    </div>
  );
}
