export type SourceUse = "pw" | "edurev" | "both" | "drip" | "later" | "skip";

export type CompareRow = {
  gate: string;
  gateCode: string;
  track: "core" | "drip" | "later";
  use: SourceUse;
  pw: string;
  edurev: string;
  how: string;
  chapters: { name: string; videos: number; docs: number; tests: number; skip?: boolean }[];
};

export const PREP_RULES = [
  "PW Parakram is the teacher. Watch the lecture, pause, write.",
  "EduRev is the workbook. Same day: tests + short notes on that chapter. Do not start a new EduRev month.",
  "Ignore EduRev’s Month 1–2–3 order. Follow C → DS → Algo → Discrete → OS → DB → CN.",
  "GA is 25 minutes inside the 4h weekday, from EduRev Quant/Verbal tests — not a PW binge.",
  "January: EduRev full mocks and GATE papers 1991–2026. No new syllabus.",
];

export const COMPARE_ROWS: CompareRow[] = [
  {
    gate: "Programming in C",
    gateCode: "PDS",
    track: "core",
    use: "pw",
    pw: "Full lecture series. Start here.",
    edurev: "34 docs, 3 tests. Almost no video.",
    how: "Learn on PW. After each C chunk, 1 EduRev test. Skip reading all 34 docs.",
    chapters: [
      { name: "Programming in C", videos: 0, docs: 34, tests: 3 },
    ],
  },
  {
    gate: "Data Structures",
    gateCode: "PDS",
    track: "core",
    use: "both",
    pw: "Lecture + tracing on paper.",
    edurev: "Arrays, recursion, LL, stacks/queues, trees, graphs — docs + many tests.",
    how: "PW lecture first. EduRev tests the same night. Trees/stacks tests are the useful part.",
    chapters: [
      { name: "Arrays", videos: 0, docs: 18, tests: 4 },
      { name: "Recursion", videos: 0, docs: 12, tests: 3 },
      { name: "Linked Lists", videos: 0, docs: 13, tests: 2 },
      { name: "Stacks & Queues", videos: 0, docs: 27, tests: 8 },
      { name: "Trees", videos: 0, docs: 31, tests: 7 },
      { name: "Graphs", videos: 0, docs: 12, tests: 4 },
    ],
  },
  {
    gate: "Algorithms",
    gateCode: "ALGO",
    track: "core",
    use: "both",
    pw: "Design + PYQ in class.",
    edurev: "Sorting, hashing, asymptotics, recurrences, D&C, greedy, graphs, DP — strong tests.",
    how: "PW for method. EduRev chapter tests after each paradigm. DP and graph tests are high value.",
    chapters: [
      { name: "Searching & Sorting", videos: 9, docs: 21, tests: 6 },
      { name: "Hashing", videos: 8, docs: 11, tests: 1 },
      { name: "Asymptotic Analysis", videos: 9, docs: 16, tests: 7 },
      { name: "Recurrence Relations", videos: 11, docs: 11, tests: 1 },
      { name: "Divide & Conquer", videos: 1, docs: 19, tests: 2 },
      { name: "Greedy Techniques", videos: 7, docs: 20, tests: 4 },
      { name: "Graph Based Algorithms", videos: 8, docs: 21, tests: 4 },
      { name: "Dynamic Programming", videos: 9, docs: 16, tests: 4 },
    ],
  },
  {
    gate: "Discrete + Probability",
    gateCode: "EM",
    track: "core",
    use: "both",
    pw: "Logic, sets, graphs, combinatorics, probability lectures.",
    edurev: "Month 2 EM block — lots of docs/tests. Linear algebra & calculus sit here too.",
    how: "Core: logic, sets, combinatorics, graphs, probability. LA and calculus wait (later).",
    chapters: [
      { name: "Propositional Logic", videos: 0, docs: 12, tests: 3 },
      { name: "Set Theory & Algebra", videos: 0, docs: 18, tests: 5 },
      { name: "Graph Theory", videos: 0, docs: 18, tests: 3 },
      { name: "Combinatorics", videos: 0, docs: 10, tests: 5 },
      { name: "Probability and Statistics", videos: 12, docs: 23, tests: 12 },
      { name: "Linear Algebra", videos: 7, docs: 26, tests: 7, skip: true },
      { name: "Calculus", videos: 5, docs: 20, tests: 9, skip: true },
    ],
  },
  {
    gate: "Operating System",
    gateCode: "OS",
    track: "core",
    use: "both",
    pw: "Lecture + Gantt/numericals.",
    edurev: "10 chapters, heavy docs on scheduling/sync/memory.",
    how: "PW for concepts. EduRev tests after CPU, sync, deadlock, memory. Disk scheduling is thin — don’t over-invest.",
    chapters: [
      { name: "Basic Concepts of OS", videos: 5, docs: 15, tests: 1 },
      { name: "Process Management", videos: 3, docs: 13, tests: 2 },
      { name: "Threads", videos: 2, docs: 14, tests: 2 },
      { name: "CPU Scheduling", videos: 0, docs: 23, tests: 4 },
      { name: "Process Synchronization", videos: 0, docs: 26, tests: 3 },
      { name: "Concurrency & Deadlock", videos: 0, docs: 16, tests: 3 },
      { name: "Memory Management", videos: 0, docs: 19, tests: 4 },
      { name: "Virtual Memory", videos: 0, docs: 13, tests: 5 },
      { name: "File Systems", videos: 0, docs: 14, tests: 6 },
      { name: "Disk Scheduling", videos: 0, docs: 8, tests: 0 },
    ],
  },
  {
    gate: "Databases",
    gateCode: "DB",
    track: "core",
    use: "both",
    pw: "SQL + normalisation + transactions.",
    edurev: "Month 3 — algebra/SQL/normalisation/transactions are test-rich.",
    how: "PW lecture. Same week: EduRev relational algebra, SQL, NF, transactions tests.",
    chapters: [
      { name: "Introduction", videos: 3, docs: 10, tests: 0 },
      { name: "ER Model", videos: 2, docs: 10, tests: 2 },
      { name: "Concept of keys", videos: 0, docs: 7, tests: 2 },
      { name: "Relational Algebra", videos: 16, docs: 14, tests: 7 },
      { name: "Integrity Constraints, Normalization", videos: 12, docs: 20, tests: 8 },
      { name: "SQL", videos: 7, docs: 14, tests: 7 },
      { name: "File Organization & Indexing", videos: 5, docs: 15, tests: 6 },
      { name: "Transaction & Concurrency Control", videos: 8, docs: 24, tests: 5 },
    ],
  },
  {
    gate: "Computer Networks",
    gateCode: "CN",
    track: "core",
    use: "both",
    pw: "2027 reduced syllabus. DNS + HTTP at app layer.",
    edurev: "Month 1 first pass is bulky. Extra OSI / old app-layer may sit in Additional Topics.",
    how: "Follow PW 2027 list. EduRev: DLL, MAC, IP, TCP, routing tests. Skip Additional Topics and extra physical-layer bulk.",
    chapters: [
      { name: "Networking Fundamentals & Physical Layer", videos: 6, docs: 27, tests: 6, skip: true },
      { name: "Data Link Layer", videos: 3, docs: 24, tests: 7 },
      { name: "Media Access Control (MAC)", videos: 1, docs: 14, tests: 4 },
      { name: "Network Layer", videos: 2, docs: 23, tests: 1 },
      { name: "Network Layer and Internetworking", videos: 0, docs: 10, tests: 0 },
      { name: "Routing", videos: 3, docs: 20, tests: 9 },
      { name: "Transport Layer", videos: 4, docs: 28, tests: 10 },
      { name: "Application Layer", videos: 2, docs: 19, tests: 6 },
      { name: "Additional Topics for GATE Preparation", videos: 0, docs: 9, tests: 4, skip: true },
    ],
  },
  {
    gate: "General Aptitude",
    gateCode: "GA",
    track: "drip",
    use: "drip",
    pw: "Not your main GA class.",
    edurev: "Quant 21 chapters, Verbal 11, Spatial 8, Analytical 7, plus Month 3 PYQ and 11 tests.",
    how: "25 min on weekdays. EduRev tests only. Do not clear all 21 Quant chapters in Month 1.",
    chapters: [
      { name: "Quantitative Aptitude (21 chapters)", videos: 0, docs: 0, tests: 0 },
      { name: "Verbal / Spatial / Analytical (Month 2)", videos: 0, docs: 0, tests: 0 },
      { name: "GA PYQ + 11 practice tests (Month 3)", videos: 0, docs: 0, tests: 11 },
    ],
  },
  {
    gate: "Digital Logic · COA · TOC · Compiler",
    gateCode: "LATER",
    track: "later",
    use: "later",
    pw: "After core is moving. DL → COA. TOC → Compiler.",
    edurev: "Full first-pass plus Month 3 revision notes. Compiler and TOC tests are decent.",
    how: "Do not open these while C/DS/Algo are unfinished. When you start, PW lecture + EduRev tests, same pattern.",
    chapters: [
      { name: "Digital Logic — 4 chapters (notes-heavy)", videos: 0, docs: 58, tests: 15 },
      { name: "COA — 9 chapters", videos: 20, docs: 152, tests: 50 },
      { name: "TOC — 6 chapters", videos: 20, docs: 113, tests: 43 },
      { name: "Compiler — 8 chapters", videos: 21, docs: 111, tests: 31 },
    ],
  },
  {
    gate: "Mocks and GATE papers",
    gateCode: "MOCKS",
    track: "later",
    use: "edurev",
    pw: "Parakram base has limited tests. Real Test Series was locked.",
    edurev: "Chapter tests, subject tests, 15 full mocks, papers 1991–2026.",
    how: "This is where EduRev wins. Use from December/January. Not now, unless a chapter test after a PW lecture.",
    chapters: [
      { name: "Chapter-wise tests (10 subjects)", videos: 0, docs: 0, tests: 157 },
      { name: "Subject-wise tests", videos: 0, docs: 0, tests: 28 },
      { name: "Full-length practice", videos: 0, docs: 0, tests: 15 },
      { name: "GATE CSE papers 1991–2026", videos: 0, docs: 49, tests: 0 },
    ],
  },
];

export function useLabel(use: SourceUse) {
  switch (use) {
    case "pw":
      return "PW first";
    case "edurev":
      return "EduRev first";
    case "both":
      return "PW + EduRev";
    case "drip":
      return "EduRev drip";
    case "later":
      return "After core";
    case "skip":
      return "Skip / thin";
  }
}
