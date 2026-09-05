import { daysUntil } from "@/lib/dates";

/**
 * Study chunks for GATE CS 2027 first pass.
 *
 * Each row is lecture + notes + pause/rewind + first MCQ set for that chunk.
 * Topic hours = sum of its chunks. Section hours = sum of its topics.
 * A "study day" is 4 focused hours, so PDS 180h = 45 days.
 *
 * First pass target is 31 Dec 2026. January is mocks, not new syllabus.
 */
export const FIRST_PASS_DATE = "2026-12-31";
export const START_DATE = "2026-09-02";
/** A weekday of focused work. Weekend days are 8h; see work-week.ts. */
export const STUDY_HOURS_PER_DAY = 4;
/** @deprecated Use workWeekPace todayTarget (4h weekdays, 8h weekends). */
export const MIN_DAILY_HOURS = 4;

export type StudyChunk = { name: string; hours: number };

export const STUDY_LOAD: Record<string, StudyChunk[]> = {
  "GA-VERBAL": [
    { name: "Grammar and sentence completion", hours: 6 },
    { name: "Vocabulary, analogies, word usage", hours: 6 },
    { name: "Reading comprehension", hours: 8 },
    { name: "Verbal PYQs and mixed drills", hours: 5 },
  ],
  "GA-QUANT": [
    { name: "Numbers, percentages, ratios, averages", hours: 8 },
    { name: "Time-work and time-speed-distance", hours: 7 },
    { name: "Profit-loss, interest, mixtures", hours: 6 },
    { name: "Permutation, combination, GA probability", hours: 7 },
    { name: "Data interpretation", hours: 6 },
    { name: "Quant PYQs", hours: 6 },
  ],
  "GA-ANALYTICAL": [
    { name: "Blood relations, directions, seating", hours: 7 },
    { name: "Series, analogies, odd-one-out", hours: 6 },
    { name: "Puzzles and logical deductions", hours: 7 },
    { name: "Analytical PYQs", hours: 5 },
  ],
  "GA-SPATIAL": [
    { name: "Mirror, water image, paper folding", hours: 4 },
    { name: "2D/3D matching and assembly", hours: 4 },
    { name: "Spatial PYQs", hours: 2 },
  ],
  "DM-LOGIC": [
    { name: "Propositional logic, truth tables, equivalences", hours: 8 },
    { name: "Predicates, quantifiers, inference rules", hours: 8 },
    { name: "Logic PYQs", hours: 9 },
  ],
  "DM-SETS": [
    { name: "Sets, relations, functions", hours: 8 },
    { name: "Partial orders and lattices", hours: 7 },
    { name: "Sets PYQs", hours: 5 },
  ],
  "DM-ALGEBRA": [
    { name: "Monoids and groups", hours: 8 },
    { name: "Algebra PYQs", hours: 4 },
  ],
  "DM-GRAPHS": [
    { name: "Graph types, paths, connectivity", hours: 8 },
    { name: "Matching and colouring", hours: 10 },
    { name: "Euler, Hamiltonian, trees vs graphs", hours: 6 },
    { name: "Graph theory PYQs", hours: 6 },
  ],
  "DM-COMB": [
    { name: "Counting, pigeonhole, inclusion-exclusion", hours: 10 },
    { name: "Recurrence relations", hours: 10 },
    { name: "Generating functions", hours: 6 },
    { name: "Combinatorics PYQs", hours: 4 },
  ],
  "EM-LA": [
    { name: "Matrices, determinants, rank", hours: 8 },
    { name: "Linear systems and Gaussian elimination", hours: 7 },
    { name: "Eigenvalues, eigenvectors, LU", hours: 8 },
    { name: "Linear algebra PYQs", hours: 5 },
  ],
  "EM-CALC": [
    { name: "Limits, continuity, mean value theorem", hours: 6 },
    { name: "Partial derivatives, maxima and minima", hours: 7 },
    { name: "Integration", hours: 4 },
    { name: "Calculus PYQs", hours: 3 },
  ],
  "EM-PROB": [
    { name: "Random variables, PMF, PDF, CDF", hours: 10 },
    { name: "Standard discrete and continuous distributions", hours: 8 },
    { name: "Mean, median, mode, variance", hours: 6 },
    { name: "Conditional probability, Bayes, independence", hours: 7 },
    { name: "Probability PYQs", hours: 4 },
  ],
  "DL-BOOL": [
    { name: "Boolean algebra identities", hours: 7 },
    { name: "Karnaugh maps", hours: 8 },
    { name: "Tabular / Quine-McCluskey minimisation", hours: 5 },
    { name: "Boolean PYQs", hours: 5 },
  ],
  "DL-CIRCUITS": [
    { name: "Combinational: adders, mux, decoders, comparators", hours: 10 },
    { name: "Latches, flip-flops, registers", hours: 8 },
    { name: "Counters and FSM design", hours: 7 },
    { name: "Circuit PYQs", hours: 5 },
  ],
  "DL-ARITH": [
    { name: "Number systems, 1s/2s complement, ranges", hours: 6 },
    { name: "Fixed-point arithmetic and overflow", hours: 5 },
    { name: "Arithmetic PYQs", hours: 4 },
  ],
  "COA-ISA": [
    { name: "Instruction formats and types", hours: 6 },
    { name: "Addressing modes", hours: 6 },
    { name: "ISA PYQs", hours: 6 },
  ],
  "COA-ALU": [
    { name: "ALU datapath and arithmetic/logic ops", hours: 7 },
    { name: "ALU PYQs", hours: 5 },
  ],
  "COA-CU": [
    { name: "Hardwired control unit", hours: 6 },
    { name: "Microprogrammed control", hours: 5 },
    { name: "Control unit PYQs", hours: 4 },
  ],
  "COA-CACHE": [
    { name: "Memory hierarchy and locality", hours: 6 },
    { name: "Cache mapping: direct, set, fully associative", hours: 10 },
    { name: "Write policies, misses, AMAT", hours: 8 },
    { name: "Cache PYQs", hours: 6 },
  ],
  "COA-IO": [
    { name: "Polling vs interrupts", hours: 5 },
    { name: "DMA", hours: 4 },
    { name: "I/O PYQs", hours: 3 },
  ],
  "COA-PIPE": [
    { name: "Pipeline stages, speedup, efficiency", hours: 8 },
    { name: "Data and control hazards, forwarding", hours: 9 },
    { name: "Pipeline PYQs", hours: 6 },
  ],
  "PDS-C": [
    { name: "Types, operators, I/O, compilation model", hours: 6 },
    { name: "Control flow: if, loops, switch", hours: 5 },
    { name: "Functions, scope, stack frames", hours: 7 },
    { name: "Arrays and strings", hours: 8 },
    { name: "Pointers and pointer arithmetic", hours: 10 },
    { name: "Structs, unions, typedef", hours: 5 },
    { name: "malloc, free, and dangling pointers", hours: 5 },
    { name: "C programming PYQs", hours: 4 },
  ],
  "PDS-REC": [
    { name: "Tracing recursion and the call stack", hours: 6 },
    { name: "Recurrences from code, tail vs non-tail", hours: 5 },
    { name: "Recursion PYQs", hours: 4 },
  ],
  "PDS-LINEAR": [
    { name: "Array patterns: search, two pointers, prefix", hours: 7 },
    { name: "Stacks and applications", hours: 7 },
    { name: "Queues, deque, circular queue", hours: 6 },
    { name: "Linear structure PYQs", hours: 5 },
  ],
  "PDS-LL": [
    { name: "Singly linked list insert, delete, reverse", hours: 8 },
    { name: "Doubly and circular lists", hours: 6 },
    { name: "Fast-slow, merge, cycle detection", hours: 6 },
    { name: "Linked list PYQs", hours: 5 },
  ],
  "PDS-TREES": [
    { name: "Binary tree traversals", hours: 8 },
    { name: "BST insert, delete, search", hours: 8 },
    { name: "Heaps: insert, delete, heapify", hours: 8 },
    { name: "Height, complete/full/perfect trees", hours: 7 },
    { name: "Tree PYQs", hours: 9 },
  ],
  "PDS-GRAPHS": [
    { name: "Adjacency list vs matrix", hours: 5 },
    { name: "BFS, DFS, and applications", hours: 10 },
    { name: "Components, bipartite check", hours: 5 },
    { name: "Graph DS PYQs", hours: 5 },
  ],
  "ALGO-SORT": [
    { name: "Linear/binary search and hashing", hours: 10 },
    { name: "Merge, quick, heap sort", hours: 10 },
    { name: "Counting and radix sort", hours: 6 },
    { name: "Sorting/searching PYQs", hours: 9 },
  ],
  "ALGO-ASYM": [
    { name: "Big-O, Theta, Omega, best/avg/worst", hours: 10 },
    { name: "Recurrences and master theorem", hours: 8 },
    { name: "Space complexity", hours: 3 },
    { name: "Complexity PYQs", hours: 4 },
  ],
  "ALGO-DESIGN": [
    { name: "Divide and conquer patterns", hours: 10 },
    { name: "Greedy: activity, Huffman, fractional knapsack", hours: 12 },
    { name: "DP: LCS, knapsack, LIS, matrix chain", hours: 16 },
    { name: "Design-paradigm PYQs", hours: 12 },
  ],
  "ALGO-GRAPH": [
    { name: "BFS/DFS, topological sort, SCC", hours: 10 },
    { name: "MST: Kruskal and Prim", hours: 10 },
    { name: "Shortest paths: Dijkstra, Bellman-Ford, Floyd-Warshall", hours: 12 },
    { name: "Graph algorithm PYQs", hours: 8 },
  ],
  "TOC-FA": [
    { name: "DFA and NFA construction", hours: 10 },
    { name: "Regex to FA, FA minimisation", hours: 10 },
    { name: "Finite automata PYQs", hours: 10 },
  ],
  "TOC-CFG": [
    { name: "CFG design, ambiguity, Chomsky normal form", hours: 10 },
    { name: "Push-down automata", hours: 8 },
    { name: "CFG/PDA PYQs", hours: 7 },
  ],
  "TOC-CFL": [
    { name: "Regular vs CFL identification", hours: 8 },
    { name: "Pumping lemmas", hours: 7 },
    { name: "CFL PYQs", hours: 5 },
  ],
  "TOC-TM": [
    { name: "Turing machine design and variants", hours: 8 },
    { name: "Decidable vs RE vs undecidable", hours: 10 },
    { name: "Undecidability PYQs", hours: 7 },
  ],
  "CD-PARSE": [
    { name: "Lexical analysis and tokens", hours: 5 },
    { name: "Top-down LL, FIRST, FOLLOW", hours: 7 },
    { name: "Bottom-up LR and SDT", hours: 8 },
    { name: "Parsing PYQs", hours: 5 },
  ],
  "CD-RUNTIME": [
    { name: "Activation records and calling conventions", hours: 5 },
    { name: "Runtime PYQs", hours: 3 },
  ],
  "CD-IR": [
    { name: "Three-address code and quadruples", hours: 6 },
    { name: "IR PYQs", hours: 4 },
  ],
  "CD-OPT": [
    { name: "Local optimisation and DAG", hours: 6 },
    { name: "Data-flow: liveness and reaching definitions", hours: 7 },
    { name: "Optimisation PYQs", hours: 4 },
  ],
  "OS-PROC": [
    { name: "System calls and process states", hours: 6 },
    { name: "Threads vs processes", hours: 5 },
    { name: "IPC", hours: 5 },
    { name: "Process PYQs", hours: 4 },
  ],
  "OS-SYNC": [
    { name: "Races, critical section, locks", hours: 10 },
    { name: "Semaphores, monitors, classic problems", hours: 12 },
    { name: "Deadlock: Coffman, Banker's, recovery", hours: 8 },
    { name: "Sync PYQs", hours: 5 },
  ],
  "OS-CPU": [
    { name: "CPU scheduling algorithms", hours: 12 },
    { name: "I/O scheduling", hours: 6 },
    { name: "Gantt charts, waiting and turnaround time", hours: 6 },
    { name: "Scheduling PYQs", hours: 6 },
  ],
  "OS-MEM": [
    { name: "Contiguous allocation, paging, segmentation", hours: 10 },
    { name: "Page replacement and thrashing", hours: 10 },
    { name: "Virtual memory, TLB, page tables", hours: 8 },
    { name: "Memory PYQs", hours: 7 },
  ],
  "OS-FS": [
    { name: "Directories, allocation, inodes", hours: 6 },
    { name: "File system PYQs", hours: 4 },
  ],
  "DB-ER": [
    { name: "ER constructs, keys, cardinality", hours: 6 },
    { name: "ER PYQs", hours: 4 },
  ],
  "DB-REL": [
    { name: "Relational model, keys, integrity", hours: 7 },
    { name: "Relational algebra and tuple calculus", hours: 10 },
    { name: "SQL: joins, nested queries, aggregation", hours: 12 },
    { name: "SQL/algebra PYQs", hours: 6 },
  ],
  "DB-NF": [
    { name: "Functional dependencies, closure, keys", hours: 8 },
    { name: "1NF through BCNF and decompositions", hours: 10 },
    { name: "Normalisation PYQs", hours: 7 },
  ],
  "DB-INDEX": [
    { name: "File organisation and blocking", hours: 5 },
    { name: "B-trees and B+ trees", hours: 6 },
    { name: "Indexing PYQs", hours: 4 },
  ],
  "DB-TXN": [
    { name: "ACID, schedules, conflict serializability", hours: 10 },
    { name: "Locks, 2PL, timestamps, recovery", hours: 9 },
    { name: "Transaction PYQs", hours: 6 },
  ],
  "CN-LAYER": [
    { name: "Layering, circuit vs packet switching", hours: 5 },
    { name: "Delay, throughput, bandwidth-delay", hours: 4 },
    { name: "Layering PYQs", hours: 3 },
  ],
  "CN-DLL": [
    { name: "CRC, checksum, Hamming codes", hours: 7 },
    { name: "MAC, CSMA/CD, Ethernet", hours: 7 },
    { name: "Data-link PYQs", hours: 4 },
  ],
  "CN-ROUTE": [
    { name: "Distance vector and count-to-infinity", hours: 10 },
    { name: "Link-state and Dijkstra routing", hours: 9 },
    { name: "Routing PYQs", hours: 6 },
  ],
  "CN-IP": [
    { name: "IPv4 header and addressing", hours: 8 },
    { name: "Fragmentation", hours: 7 },
    { name: "CIDR, subnetting, NAT", hours: 8 },
    { name: "IP PYQs", hours: 5 },
  ],
  "CN-TCP": [
    { name: "TCP header, handshake, RTT", hours: 8 },
    { name: "Flow control and congestion control", hours: 10 },
    { name: "Socket API", hours: 4 },
    { name: "TCP PYQs", hours: 5 },
  ],
  "CN-APP": [
    { name: "DNS", hours: 4 },
    { name: "HTTP", hours: 3 },
    { name: "Application PYQs", hours: 3 },
  ],
};

export const STEP_KINDS = ["lecture", "dpp", "test"] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export type StepFlags = {
  lectureDone: boolean;
  dppDone: boolean;
  testDone: boolean;
};

export const STEP_LABEL: Record<StepKind, string> = {
  lecture: "Lecture",
  dpp: "DPP",
  test: "Test",
};

export const STEP_HINT: Record<StepKind, string> = {
  lecture: "PW video, pause, write",
  dpp: "Practice problems for this chunk",
  test: "One EduRev chapter test",
};

/** Lecture / DPP / Test share of a chunk. Last step absorbs rounding so hours add up. */
export function splitStepHours(hours: number): Record<StepKind, number> {
  const lecture = Math.round(hours * 0.55 * 10) / 10;
  const dpp = Math.round(hours * 0.25 * 10) / 10;
  const test = Math.round((hours - lecture - dpp) * 10) / 10;
  return { lecture, dpp, test };
}

export function flagsFromRow(row?: {
  completed?: boolean;
  lectureDone?: boolean;
  dppDone?: boolean;
  testDone?: boolean;
}): StepFlags {
  const lectureDone = Boolean(row?.lectureDone);
  const dppDone = Boolean(row?.dppDone);
  const testDone = Boolean(row?.testDone);
  if (row?.completed && !lectureDone && !dppDone && !testDone) {
    return { lectureDone: true, dppDone: true, testDone: true };
  }
  return { lectureDone, dppDone, testDone };
}

export function stepsComplete(steps: StepFlags) {
  return steps.lectureDone && steps.dppDone && steps.testDone;
}

export function applyStepFlags(hours: number, steps: StepFlags, kind: StepKind, done: boolean) {
  const next: StepFlags = {
    lectureDone: kind === "lecture" ? done : steps.lectureDone,
    dppDone: kind === "dpp" ? done : steps.dppDone,
    testDone: kind === "test" ? done : steps.testDone,
  };
  const remaining = chunkRemaining(hours, next);
  return { ...next, remaining, completed: remaining <= 0.05 };
}

export function chunkRemaining(hours: number, steps: StepFlags): number {
  const split = splitStepHours(hours);
  let left = 0;
  if (!steps.lectureDone) left += split.lecture;
  if (!steps.dppDone) left += split.dpp;
  if (!steps.testDone) left += split.test;
  return Math.round(left * 10) / 10;
}

export function stepDone(steps: StepFlags, kind: StepKind): boolean {
  if (kind === "lecture") return steps.lectureDone;
  if (kind === "dpp") return steps.dppDone;
  return steps.testDone;
}

export function nextOpenStep(steps: StepFlags): StepKind | null {
  return STEP_KINDS.find((kind) => !stepDone(steps, kind)) ?? null;
}

type SubtopicProgressRow = {
  id?: string;
  name: string;
  completed?: boolean;
  lectureDone?: boolean;
  dppDone?: boolean;
  testDone?: boolean;
};

function hydrateChunk(name: string, hours: number, row?: SubtopicProgressRow): ChunkProgress {
  const flags = flagsFromRow(row);
  const remaining = chunkRemaining(hours, flags);
  return {
    name,
    hours,
    remaining,
    completed: remaining <= 0.05,
    id: row?.id,
    ...flags,
  };
}

export type ChunkProgress = StudyChunk &
  StepFlags & {
    completed: boolean;
    remaining: number;
    id?: string;
  };

export function chunkHours(chunks: StudyChunk[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.hours, 0);
}

export function topicStudyHours(code: string): number {
  return chunkHours(STUDY_LOAD[code] ?? []);
}

export function daysForHours(hours: number): number {
  if (hours <= 0) return 0;
  return Math.max(1, Math.ceil(hours / STUDY_HOURS_PER_DAY));
}

export function formatHours(hours: number): string {
  const n = Math.round(hours * 10) / 10;
  return Number.isInteger(n) ? `${n}h` : `${n.toFixed(1)}h`;
}

export function formatStudySpan(hours: number): string {
  if (hours <= 0) return "Covered";
  const days = hours / STUDY_HOURS_PER_DAY;
  const dayText = Number.isInteger(days) ? `${days}d` : `${days.toFixed(1)}d`;
  return `${formatHours(hours)} · ${dayText}`;
}

export function hoursPerDayNeeded(remainingHours: number, daysLeft: number): number {
  if (remainingHours <= 0) return 0;
  if (daysLeft <= 0) return remainingHours;
  return Math.ceil((remainingHours / daysLeft) * 10) / 10;
}

export function delaySnapshot(input: {
  today: string;
  remainingHours: number;
  totalHours: number;
  loggedHours: number;
}) {
  const daysLeft = daysUntil(input.today, FIRST_PASS_DATE);
  const daysElapsed = daysUntil(START_DATE, input.today);
  const actualDone = Math.max(0, input.totalHours - input.remainingHours);
  const todayTarget = MIN_DAILY_HOURS;
  const todayLeft = Math.max(0, Math.round((todayTarget - input.loggedHours) * 10) / 10);
  return {
    daysLeft,
    daysElapsed,
    dailyPace: todayTarget,
    paceNow: todayTarget,
    todayTarget,
    todayLeft,
    delayHours: 0,
    aheadHours: 0,
    actualDone: Math.round(actualDone * 10) / 10,
  };
}

export function progressFromChunks(
  chunks: {
    hours: number;
    completed?: boolean;
    remaining?: number;
    lectureDone?: boolean;
    dppDone?: boolean;
    testDone?: boolean;
  }[],
) {
  const hours = chunkHours(chunks);
  const remaining =
    Math.round(
      chunks.reduce((sum, chunk) => {
        if (typeof chunk.remaining === "number") return sum + chunk.remaining;
        return sum + chunkRemaining(chunk.hours, flagsFromRow(chunk));
      }, 0) * 10,
    ) / 10;
  const doneCount = chunks.filter((chunk) => {
    const left =
      typeof chunk.remaining === "number" ? chunk.remaining : chunkRemaining(chunk.hours, flagsFromRow(chunk));
    return left <= 0.05;
  }).length;
  return {
    hours,
    remaining,
    days: daysForHours(remaining),
    percent: hours === 0 ? 100 : Math.round(((hours - remaining) / hours) * 100),
    doneCount,
    chunkCount: chunks.length,
  };
}

export function topicProgress(
  code: string,
  subtopics: SubtopicProgressRow[],
): {
  hours: number;
  remaining: number;
  days: number;
  percent: number;
  chunks: ChunkProgress[];
} {
  const catalog = STUDY_LOAD[code] ?? [];
  const byName = new Map(subtopics.map((row) => [row.name, row]));

  if (catalog.length === 0) {
    const hours = 12;
    const each = subtopics.length ? hours / subtopics.length : 0;
    const chunks = subtopics.map((row) => hydrateChunk(row.name, each, row));
    const remaining = chunks.reduce((sum, chunk) => sum + chunk.remaining, 0);
    return {
      hours,
      remaining,
      days: daysForHours(remaining),
      percent: hours === 0 ? 0 : Math.round((1 - remaining / hours) * 100),
      chunks,
    };
  }

  const chunks = catalog.map((chunk) => hydrateChunk(chunk.name, chunk.hours, byName.get(chunk.name)));
  const hours = chunkHours(chunks);
  const remaining = chunks.reduce((sum, chunk) => sum + chunk.remaining, 0);
  return {
    hours,
    remaining,
    days: daysForHours(remaining),
    percent: hours === 0 ? 100 : Math.round(((hours - remaining) / hours) * 100),
    chunks,
  };
}

export function sectionProgress(topics: { code: string; subtopics: SubtopicProgressRow[] }[]) {
  const rows = topics.map((topic) => topicProgress(topic.code, topic.subtopics));
  const hours = rows.reduce((sum, row) => sum + row.hours, 0);
  const remaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  return {
    hours,
    remaining,
    days: daysForHours(remaining),
    percent: hours === 0 ? 0 : Math.round(((hours - remaining) / hours) * 100),
    topicCount: topics.length,
    chunkCount: rows.reduce((sum, row) => sum + row.chunks.length, 0),
  };
}
