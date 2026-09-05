import { ExamPriority, PrismaClient, PyqFrequency, TaskType } from "@prisma/client";
import { generateSchedule } from "../src/lib/scheduler";
import { toDateOnly } from "../src/lib/dates";
import { STUDY_LOAD } from "../src/lib/study-load";
import { TOPIC_PREREQS } from "../src/lib/prereqs";

const prisma = new PrismaClient();

const WEIGHT = "goclasses-2023-2025";

// Topic.minutes are scheduler packing times. Study hours and chunks live in src/lib/study-load.ts.

type TopicSeed = {
  code: string;
  name: string;
  minutes: number;
  frequency: PyqFrequency;
  priority: ExamPriority;
  phase: string;
};

type SubjectSeed = {
  code: string;
  name: string;
  pyqAvg: number;
  low: number;
  high: number;
  official?: number | null;
  priority: ExamPriority;
  frequency: PyqFrequency;
  topics: TopicSeed[];
};

type SectionSeed = {
  code: string;
  name: string;
  official?: number | null;
  pyqAvg?: number | null;
  priority: ExamPriority;
  subjects: SubjectSeed[];
};

const SYLLABUS: SectionSeed[] = [
  {
    code: "GA",
    name: "General Aptitude",
    official: 15,
    pyqAvg: 15,
    priority: "CRITICAL",
    subjects: [
      {
        code: "GA",
        name: "General Aptitude",
        pyqAvg: 15,
        low: 14,
        high: 15,
        official: 15,
        priority: "CRITICAL",
        frequency: "HIGH",
        topics: [
          { code: "GA-VERBAL", name: "Verbal Aptitude", minutes: 180, frequency: "HIGH", priority: "CRITICAL", phase: "foundation" },
          { code: "GA-QUANT", name: "Quantitative Aptitude", minutes: 240, frequency: "HIGH", priority: "CRITICAL", phase: "foundation" },
          { code: "GA-ANALYTICAL", name: "Analytical Aptitude", minutes: 150, frequency: "HIGH", priority: "CRITICAL", phase: "foundation" },
          { code: "GA-SPATIAL", name: "Spatial Aptitude", minutes: 90, frequency: "MEDIUM", priority: "HIGH", phase: "foundation" },
        ],
      },
    ],
  },
  {
    code: "EM",
    name: "Engineering Mathematics",
    official: 13,
    pyqAvg: 11.7,
    priority: "CRITICAL",
    subjects: [
      {
        code: "DM",
        name: "Discrete Mathematics",
        pyqAvg: 5.3,
        low: 5,
        high: 6,
        priority: "CRITICAL",
        frequency: "HIGH",
        topics: [
          { code: "DM-LOGIC", name: "Propositional and first-order logic", minutes: 180, frequency: "HIGH", priority: "CRITICAL", phase: "foundation" },
          { code: "DM-SETS", name: "Sets, relations, functions, partial orders, lattices", minutes: 150, frequency: "MEDIUM", priority: "HIGH", phase: "foundation" },
          { code: "DM-ALGEBRA", name: "Monoids and groups", minutes: 90, frequency: "STANDARD", priority: "STANDARD", phase: "remaining" },
          { code: "DM-GRAPHS", name: "Graphs: connectivity, matching, colouring", minutes: 180, frequency: "HIGH", priority: "CRITICAL", phase: "foundation" },
          { code: "DM-COMB", name: "Combinatorics: counting, recurrence, generating functions", minutes: 180, frequency: "HIGH", priority: "CRITICAL", phase: "foundation" },
        ],
      },
      {
        code: "EM-CORE",
        name: "Linear Algebra, Calculus, Probability",
        pyqAvg: 6.3,
        low: 4,
        high: 8,
        priority: "HIGH",
        frequency: "HIGH",
        topics: [
          { code: "EM-LA", name: "Linear Algebra", minutes: 150, frequency: "MEDIUM", priority: "HIGH", phase: "remaining" },
          { code: "EM-CALC", name: "Calculus", minutes: 120, frequency: "STANDARD", priority: "STANDARD", phase: "remaining" },
          { code: "EM-PROB", name: "Probability and Statistics", minutes: 180, frequency: "HIGH", priority: "HIGH", phase: "remaining" },
        ],
      },
    ],
  },
  {
    code: "DL",
    name: "Digital Logic",
    official: null,
    pyqAvg: 5.7,
    priority: "STANDARD",
    subjects: [
      {
        code: "DL",
        name: "Digital Logic",
        pyqAvg: 5.7,
        low: 5,
        high: 6,
        priority: "STANDARD",
        frequency: "HIGH",
        topics: [
          { code: "DL-BOOL", name: "Boolean algebra and minimisation", minutes: 150, frequency: "HIGH", priority: "STANDARD", phase: "foundation" },
          { code: "DL-CIRCUITS", name: "Combinational and sequential circuits", minutes: 180, frequency: "HIGH", priority: "STANDARD", phase: "foundation" },
          { code: "DL-ARITH", name: "Number representation and arithmetic", minutes: 120, frequency: "MEDIUM", priority: "STANDARD", phase: "foundation" },
        ],
      },
    ],
  },
  {
    code: "COA",
    name: "Computer Organization and Architecture",
    pyqAvg: 9.7,
    priority: "HIGH",
    subjects: [
      {
        code: "COA",
        name: "Computer Organization and Architecture",
        pyqAvg: 9.7,
        low: 8,
        high: 12,
        priority: "HIGH",
        frequency: "HIGH",
        topics: [
          { code: "COA-ISA", name: "Instruction set and addressing modes", minutes: 150, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "COA-ALU", name: "ALU design", minutes: 90, frequency: "MEDIUM", priority: "HIGH", phase: "core" },
          { code: "COA-CU", name: "Hardwired and microprogrammed control", minutes: 120, frequency: "MEDIUM", priority: "HIGH", phase: "core" },
          { code: "COA-CACHE", name: "Memory hierarchy, performance, cache mapping", minutes: 210, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "COA-IO", name: "I/O: interrupt and DMA", minutes: 90, frequency: "MEDIUM", priority: "HIGH", phase: "core" },
          { code: "COA-PIPE", name: "Instruction pipelining and hazards", minutes: 180, frequency: "HIGH", priority: "HIGH", phase: "core" },
        ],
      },
    ],
  },
  {
    code: "PDS",
    name: "Programming and Data Structures",
    pyqAvg: 9.7,
    priority: "CRITICAL",
    subjects: [
      {
        code: "PDS",
        name: "Programming and Data Structures",
        pyqAvg: 9.7,
        low: 8,
        high: 11,
        priority: "CRITICAL",
        frequency: "HIGH",
        topics: [
          { code: "PDS-C", name: "Programming in C", minutes: 300, frequency: "HIGH", priority: "CRITICAL", phase: "foundation" },
          { code: "PDS-REC", name: "Recursion", minutes: 90, frequency: "HIGH", priority: "CRITICAL", phase: "foundation" },
          { code: "PDS-LINEAR", name: "Arrays, stacks, queues", minutes: 150, frequency: "HIGH", priority: "CRITICAL", phase: "core" },
          { code: "PDS-LL", name: "Linked lists", minutes: 150, frequency: "HIGH", priority: "CRITICAL", phase: "core" },
          { code: "PDS-TREES", name: "Trees, BST, binary heaps", minutes: 210, frequency: "HIGH", priority: "CRITICAL", phase: "core" },
          { code: "PDS-GRAPHS", name: "Graphs", minutes: 120, frequency: "MEDIUM", priority: "HIGH", phase: "core" },
        ],
      },
    ],
  },
  {
    code: "ALGO",
    name: "Algorithms",
    pyqAvg: 7.3,
    priority: "HIGH",
    subjects: [
      {
        code: "ALGO",
        name: "Algorithms",
        pyqAvg: 7.3,
        low: 6,
        high: 8,
        priority: "HIGH",
        frequency: "HIGH",
        topics: [
          { code: "ALGO-SORT", name: "Searching, sorting, hashing", minutes: 180, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "ALGO-ASYM", name: "Asymptotic worst-case time and space complexity", minutes: 120, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "ALGO-DESIGN", name: "Greedy, DP, divide-and-conquer", minutes: 240, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "ALGO-GRAPH", name: "Graph traversals, MST, shortest paths", minutes: 210, frequency: "HIGH", priority: "HIGH", phase: "core" },
        ],
      },
    ],
  },
  {
    code: "TOC",
    name: "Theory of Computation",
    pyqAvg: 8.3,
    priority: "HIGH",
    subjects: [
      {
        code: "TOC",
        name: "Theory of Computation",
        pyqAvg: 8.3,
        low: 7,
        high: 9,
        priority: "HIGH",
        frequency: "HIGH",
        topics: [
          { code: "TOC-FA", name: "Regular expressions and finite automata", minutes: 210, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "TOC-CFG", name: "CFG and push-down automata", minutes: 180, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "TOC-CFL", name: "Regular and context-free languages, pumping lemma", minutes: 150, frequency: "MEDIUM", priority: "HIGH", phase: "core" },
          { code: "TOC-TM", name: "Turing machines and undecidability", minutes: 180, frequency: "HIGH", priority: "HIGH", phase: "core" },
        ],
      },
    ],
  },
  {
    code: "CD",
    name: "Compiler Design",
    pyqAvg: 6.0,
    priority: "STANDARD",
    subjects: [
      {
        code: "CD",
        name: "Compiler Design",
        pyqAvg: 6.0,
        low: 5,
        high: 8,
        priority: "STANDARD",
        frequency: "MEDIUM",
        topics: [
          { code: "CD-PARSE", name: "Lexical analysis, parsing, SDT", minutes: 210, frequency: "HIGH", priority: "STANDARD", phase: "remaining" },
          { code: "CD-RUNTIME", name: "Runtime environments", minutes: 90, frequency: "STANDARD", priority: "STANDARD", phase: "remaining" },
          { code: "CD-IR", name: "Intermediate code generation", minutes: 90, frequency: "MEDIUM", priority: "STANDARD", phase: "remaining" },
          { code: "CD-OPT", name: "Local optimisation and data-flow analyses", minutes: 150, frequency: "MEDIUM", priority: "STANDARD", phase: "remaining" },
        ],
      },
    ],
  },
  {
    code: "OS",
    name: "Operating System",
    pyqAvg: 8.3,
    priority: "HIGH",
    subjects: [
      {
        code: "OS",
        name: "Operating System",
        pyqAvg: 8.3,
        low: 7,
        high: 10,
        priority: "HIGH",
        frequency: "HIGH",
        topics: [
          { code: "OS-PROC", name: "System calls, processes, threads, IPC", minutes: 150, frequency: "MEDIUM", priority: "HIGH", phase: "core" },
          { code: "OS-SYNC", name: "Concurrency, synchronisation, deadlock", minutes: 210, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "OS-CPU", name: "CPU and I/O scheduling", minutes: 180, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "OS-MEM", name: "Memory management and virtual memory", minutes: 210, frequency: "HIGH", priority: "HIGH", phase: "core" },
          { code: "OS-FS", name: "File systems", minutes: 90, frequency: "STANDARD", priority: "HIGH", phase: "core" },
        ],
      },
    ],
  },
  {
    code: "DB",
    name: "Databases",
    pyqAvg: 7.0,
    priority: "HIGH",
    subjects: [
      {
        code: "DB",
        name: "Databases",
        pyqAvg: 7.0,
        low: 5,
        high: 8,
        priority: "HIGH",
        frequency: "HIGH",
        topics: [
          { code: "DB-ER", name: "ER-model", minutes: 60, frequency: "STANDARD", priority: "HIGH", phase: "remaining" },
          { code: "DB-REL", name: "Relational model, algebra, tuple calculus, SQL", minutes: 210, frequency: "HIGH", priority: "HIGH", phase: "remaining" },
          { code: "DB-NF", name: "Integrity constraints and normal forms", minutes: 150, frequency: "HIGH", priority: "HIGH", phase: "remaining" },
          { code: "DB-INDEX", name: "File organisation and indexing (B/B+ trees)", minutes: 120, frequency: "MEDIUM", priority: "HIGH", phase: "remaining" },
          { code: "DB-TXN", name: "Transactions and concurrency control", minutes: 150, frequency: "HIGH", priority: "HIGH", phase: "remaining" },
        ],
      },
    ],
  },
  {
    code: "CN",
    name: "Computer Networks",
    pyqAvg: 8.3,
    priority: "HIGH",
    subjects: [
      {
        code: "CN",
        name: "Computer Networks",
        pyqAvg: 8.3,
        low: 8,
        high: 9,
        priority: "HIGH",
        frequency: "HIGH",
        topics: [
          { code: "CN-LAYER", name: "Layering, switching, performance metrics", minutes: 90, frequency: "MEDIUM", priority: "HIGH", phase: "remaining" },
          { code: "CN-DLL", name: "Data link: error detection, MAC, Ethernet", minutes: 120, frequency: "MEDIUM", priority: "HIGH", phase: "remaining" },
          { code: "CN-ROUTE", name: "Distance-vector and link-state routing", minutes: 150, frequency: "HIGH", priority: "HIGH", phase: "remaining" },
          { code: "CN-IP", name: "IPv4: fragmentation, CIDR, NAT", minutes: 180, frequency: "HIGH", priority: "HIGH", phase: "remaining" },
          { code: "CN-TCP", name: "TCP flow/congestion control, socket API", minutes: 180, frequency: "HIGH", priority: "HIGH", phase: "remaining" },
          { code: "CN-APP", name: "DNS and HTTP", minutes: 90, frequency: "MEDIUM", priority: "HIGH", phase: "remaining" },
        ],
      },
    ],
  },
];

async function main() {
  await prisma.dailyPlanItem.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.pyqAttempt.deleteMany();
  await prisma.pyq.deleteMany();
  await prisma.studyTask.deleteMany();
  await prisma.courseDpp.deleteMany();
  await prisma.courseLecture.deleteMany();
  await prisma.courseSource.deleteMany();
  await prisma.topicDependency.deleteMany();
  await prisma.subtopic.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.weekdayHours.deleteMany();
  await prisma.commitment.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({ data: { name: "GATE CS 2027" } });

  await prisma.settings.create({
    data: {
      examDate: toDateOnly("2027-02-07"),
      targetMarks: 100,
      minDailyMinutes: 240,
      maxDailyMinutes: 480,
      restWeekday: null,
      officialGaMarks: 15,
      officialEmMarks: 13,
      firstPassDeadline: toDateOnly("2026-12-31"),
      gaDripMinutes: 25,
      preferredWindow: "06:00-08:15, 21:00-22:30",
    },
  });

  const hours = [
    { weekday: 0, minutes: 480 },
    { weekday: 1, minutes: 240 },
    { weekday: 2, minutes: 240 },
    { weekday: 3, minutes: 240 },
    { weekday: 4, minutes: 240 },
    { weekday: 5, minutes: 240 },
    { weekday: 6, minutes: 480 },
  ];
  await prisma.weekdayHours.createMany({ data: hours });

  await prisma.phase.createMany({
    data: [
      { name: "Foundation", slug: "foundation", startDate: toDateOnly("2026-09-07"), endDate: toDateOnly("2026-09-30"), sortOrder: 1 },
      { name: "Core CS", slug: "core", startDate: toDateOnly("2026-10-01"), endDate: toDateOnly("2026-10-31"), sortOrder: 2 },
      { name: "Remaining first pass", slug: "remaining", startDate: toDateOnly("2026-11-01"), endDate: toDateOnly("2026-11-30"), sortOrder: 3 },
      { name: "PYQ + practice", slug: "pyq", startDate: toDateOnly("2026-12-01"), endDate: toDateOnly("2026-12-31"), sortOrder: 4 },
      { name: "Revision + mocks", slug: "mocks", startDate: toDateOnly("2027-01-01"), endDate: toDateOnly("2027-01-31"), sortOrder: 5 },
      { name: "Final revision", slug: "final", startDate: toDateOnly("2027-02-01"), endDate: toDateOnly("2027-02-07"), sortOrder: 6 },
    ],
  });

  const topicIds = new Map<string, string>();
  const topicMeta = new Map<string, { subjectId: string; expected: number; frequency: PyqFrequency; phase: string }>();

  let sectionOrder = 0;
  for (const section of SYLLABUS) {
    const createdSection = await prisma.section.create({
      data: {
        code: section.code,
        name: section.name,
        sortOrder: sectionOrder++,
        officialFixedMarks: section.official ?? null,
        pyqAvgMarks: section.pyqAvg ?? null,
        examPriority: section.priority,
        pyqFrequency: "HIGH",
        weightageSource: WEIGHT,
        inSyllabus2027: true,
      },
    });

    let subjectOrder = 0;
    for (const subject of section.subjects) {
      const createdSubject = await prisma.subject.create({
        data: {
          sectionId: createdSection.id,
          code: subject.code,
          name: subject.name,
          sortOrder: subjectOrder++,
          officialFixedMarks: subject.official ?? null,
          pyqAvgMarks: subject.pyqAvg,
          pyqRangeLow: subject.low,
          pyqRangeHigh: subject.high,
          examPriority: subject.priority,
          pyqFrequency: subject.frequency,
          weightageSource: WEIGHT,
        },
      });

      let topicOrder = 0;
      for (const topic of subject.topics) {
        const createdTopic = await prisma.topic.create({
          data: {
            subjectId: createdSubject.id,
            code: topic.code,
            name: topic.name,
            sortOrder: topicOrder++,
            pyqFrequency: topic.frequency,
            examPriority: topic.priority,
            estimatedMinutes: topic.minutes,
            phaseSlug: topic.phase,
            weightageSource: WEIGHT,
            subtopics: {
              create: (STUDY_LOAD[topic.code] ?? []).map((chunk, i) => ({
                name: chunk.name,
                sortOrder: i,
                pyqFrequency: topic.frequency,
              })),
            },
          },
        });
        topicIds.set(topic.code, createdTopic.id);
        topicMeta.set(createdTopic.id, {
          subjectId: createdSubject.id,
          expected: subject.pyqAvg / subject.topics.length,
          frequency: topic.frequency,
          phase: topic.phase,
        });
      }
    }
  }

  for (const [from, to] of TOPIC_PREREQS) {
    const fromId = topicIds.get(from);
    const toId = topicIds.get(to);
    if (fromId && toId) {
      await prisma.topicDependency.create({ data: { fromTopicId: fromId, toTopicId: toId } });
    }
  }

  const pw = await prisma.courseSource.create({ data: { name: "Physics Wallah" } });
  const cTopicId = topicIds.get("PDS-C");
  const lectures = [
    { n: 1, title: "C Programming — Introduction", min: 45 },
    { n: 2, title: "C Programming — Functions and scope", min: 50 },
    { n: 3, title: "C Programming — Arrays", min: 55 },
    { n: 4, title: "C Programming — Pointers", min: 60 },
    { n: 5, title: "C Programming — Strings and practice", min: 50 },
  ];
  const lectureRows = [];
  for (const lec of lectures) {
    const row = await prisma.courseLecture.create({
      data: {
        sourceId: pw.id,
        topicId: cTopicId,
        subjectName: "Programming and Data Structures",
        chapter: "C Programming",
        lectureNumber: lec.n,
        title: lec.title,
        durationMinutes: lec.min,
      },
    });
    lectureRows.push(row);
    await prisma.studyTask.create({
      data: {
        topicId: cTopicId,
        lectureId: row.id,
        taskType: TaskType.LECTURE,
        title: `PW Lecture ${lec.n}: ${lec.title}`,
        estimatedMinutes: lec.min,
        remainingMinutes: lec.min,
        originalEstimatedMinutes: lec.min,
        source: "PW",
        lectureReference: `L${lec.n}`,
        isGaDrip: false,
      },
    });
  }
  for (const n of [3, 4]) {
    const dpp = await prisma.courseDpp.create({
      data: {
        sourceId: pw.id,
        topicId: cTopicId,
        subjectName: "Programming and Data Structures",
        chapter: "C Programming",
        dppNumber: n,
        title: `DPP ${n}`,
      },
    });
    await prisma.studyTask.create({
      data: {
        topicId: cTopicId,
        dppId: dpp.id,
        taskType: TaskType.DPP,
        title: `DPP ${n} — C Programming`,
        estimatedMinutes: 40,
        remainingMinutes: 40,
        originalEstimatedMinutes: 40,
        source: "PW",
      },
    });
  }

  const allTopics = await prisma.topic.findMany({ include: { lectures: true, subject: true } });
  for (const topic of allTopics) {
    const hasLectureTasks = topic.lectures.length > 0;
    if (!hasLectureTasks) {
      await prisma.studyTask.create({
        data: {
          topicId: topic.id,
          taskType: TaskType.LECTURE,
          title: `Lecture — ${topic.name}`,
          estimatedMinutes: topic.estimatedMinutes,
          remainingMinutes: topic.estimatedMinutes,
          originalEstimatedMinutes: topic.estimatedMinutes,
        },
      });
    }
    await prisma.studyTask.create({
      data: {
        topicId: topic.id,
        taskType: TaskType.NOTES,
        title: `Notes — ${topic.name}`,
        estimatedMinutes: 25,
        remainingMinutes: 25,
        originalEstimatedMinutes: 25,
      },
    });
    await prisma.studyTask.create({
      data: {
        topicId: topic.id,
        taskType: TaskType.PRACTICE,
        title: `MCQs — ${topic.name}`,
        estimatedMinutes: 40,
        remainingMinutes: 40,
        originalEstimatedMinutes: 40,
      },
    });
    const ga = topic.subject.code === "GA";
    await prisma.studyTask.create({
      data: {
        topicId: topic.id,
        taskType: TaskType.PYQ,
        title: ga ? `GA drill — ${topic.name}` : `PYQs — ${topic.name}`,
        estimatedMinutes: ga ? 120 : 35,
        remainingMinutes: ga ? 120 : 35,
        originalEstimatedMinutes: ga ? 120 : 35,
        isGaDrip: ga,
      },
    });
    await prisma.studyTask.create({
      data: {
        topicId: topic.id,
        taskType: TaskType.REVISION,
        title: `Revision — ${topic.name}`,
        estimatedMinutes: 25,
        remainingMinutes: 25,
        originalEstimatedMinutes: 25,
      },
    });
    await prisma.studyTask.create({
      data: {
        topicId: topic.id,
        taskType: TaskType.SECTION_TEST,
        title: `Test — ${topic.name}`,
        estimatedMinutes: 40,
        remainingMinutes: 40,
        originalEstimatedMinutes: 40,
      },
    });
  }

  const settings = await prisma.settings.findFirstOrThrow();
  const weekdayHours = await prisma.weekdayHours.findMany();
  const hoursArr = [0, 0, 0, 0, 0, 0, 0];
  for (const h of weekdayHours) hoursArr[h.weekday] = h.minutes;
  const tasks = await prisma.studyTask.findMany();
  const deps = await prisma.topicDependency.findMany();
  const phases = await prisma.phase.findMany();

  const plan = generateSchedule({
    fromDate: "2026-09-07",
    examDate: toISO(settings.examDate),
    weekdayHours: hoursArr,
    restWeekday: settings.restWeekday,
    minDailyMinutes: settings.minDailyMinutes,
    maxDailyMinutes: settings.maxDailyMinutes,
    gaDripMinutes: settings.gaDripMinutes,
    commitments: [],
    phases: phases.map((p) => ({ slug: p.slug, startDate: toISO(p.startDate), endDate: toISO(p.endDate) })),
    topics: allTopics.map((t) => {
      const meta = topicMeta.get(t.id);
      return {
        id: t.id,
        subjectId: t.subjectId,
        expectedMarks: meta?.expected ?? t.pyqAvgMarks ?? 4,
        frequency: t.pyqFrequency,
        inSyllabus2027: t.inSyllabus2027,
        phaseSlug: meta?.phase ?? null,
        isGa: t.subject.code === "GA",
      };
    }),
    dependencies: deps.map((d) => ({ fromTopicId: d.fromTopicId, toTopicId: d.toTopicId })),
    tasks: tasks.map((t) => ({
      id: t.id,
      topicId: t.topicId,
      title: t.title,
      remainingMinutes: t.remainingMinutes,
      status: t.status,
      isGaDrip: t.isGaDrip,
    })),
    completedTopicIds: [],
  });

  if (plan.length > 0) {
    await prisma.dailyPlanItem.createMany({
      data: plan.map((item) => ({
        taskId: item.taskId,
        date: toDateOnly(item.date),
        plannedMinutes: item.plannedMinutes,
      })),
    });
  }

  const firstDates = new Map<string, string>();
  for (const item of plan) {
    if (!firstDates.has(item.taskId)) firstDates.set(item.taskId, item.date);
  }
  for (const [taskId, date] of firstDates) {
    await prisma.studyTask.update({
      where: { id: taskId },
      data: { plannedDate: toDateOnly(date) },
    });
  }

  console.log(`Seeded ${allTopics.length} topics and ${plan.length} plan items.`);
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
