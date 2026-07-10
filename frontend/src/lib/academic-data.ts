// Realistic academic dataset for AICAS.
// Deterministic generators: every (course, teacher, section) triple
// produces stable, unique analytics without duplication.

export const FACULTY: string[] = [
  "Muhammad Abu Rayan",
  "Nazmun Nessa Moon",
  "Fizar Ahmed",
  "Naznin Sultana",
  "Arif Mahmud",
  "Md. Sohidul Islam",
  "M Mahmudur Rahman",
  "Abdus Sattar",
  "Md. Ali Hossain",
  "Anuz Kumar Chakrabarty",
  "Mohammad Nuruzzaman Bhuiyan",
  "Md. Akhtaruzzaman",
  "Masud Rana Rashel",
  "Mohammad Salek Parvez",
  "Masuma Parvin",
  "Shirin Sultana",
  "Md. Sadekur Rahman",
  "Dewan Mamun Raza",
  "Md Alamgir Kabir",
  "Mushfiqur Rahman",
  "Mohammad Jahangir Alam",
  "Shahadat Hossain",
  "Sharmin Akter",
  "Md Masum Billah",
  "Md Assaduzzaman",
  "Mayen Uddin Mojumdar",
  "Fahiba Farhin",
  "Md. Hasanuzzaman Dipu",
  "Ala Fahad Aburumman",
  "Md. Mosfiqur Rahman",
  "Md. Rasedul Islam",
  "Sakia Shabnam Kader",
  "Shayla Sharmin",
  "Salma Saba",
  "Md. Shahriar Shakil",
  "Md. Abdullah Al Kafi",
  "Sakib Mahmood Chowdhury",
  "Nushrat Jahan Oyshi",
  "Md. Jakaria Zobair",
  "Md. Shohidul Islam Polash",
  "Asraf Ullah Rahat",
  "Mehadi Hasan",
  "Sadia Jannat Mitu",
  "Bulbul Ahmed Joy",
  "Faiza Feroz",
];

export const DEPARTMENTS = [
  "Computer Science and Engineering",
  "Electrical and Electronic Engineering",
  "General Studies",
  "Business Administration (BBA)",
  "Computer Information Systems (CIS)",
  "Software Engineering",
  "Agriculture",
] as const;

const EEE_COURSES = new Set([
  "Basic Electronics",
  "Digital Electronics",
  "Digital Logic Design",
  "Electrical Circuits",
  "Electronic Devices and Circuits",
  "Instrumentation and Control",
  "Microprocessor and Microcontroller",
  "Microprocessor, Embedded Systems and IoT",
  "Embedded Systems and IoT",
]);

const GENERAL_COURSES = new Set([
  "Art of Living",
  "Bangladesh Studies",
  "Basic Functional English and English Spoken",
  "Economics",
  "Engineering Economics",
  "Engineering Mathematics",
  "Financial and Managerial Accounting",
  "Introduction to Biology and Chemistry for Computation",
  "Math for Computer Science",
  "Mathematics I",
  "Mathematics II",
  "Numerical Methods",
  "Physics I",
  "Physics II",
  "Discrete Mathematics",
]);

// Courses specific to newly added departments.
const EXTRA_DEPT_COURSES: Record<string, string[]> = {
  "Business Administration (BBA)": [
    "Principles of Management",
    "Marketing Principles",
    "Organizational Behavior",
    "Business Communication",
    "Human Resource Management",
    "Strategic Management",
    "Financial and Managerial Accounting",
    "Engineering Economics",
  ],
  "Computer Information Systems (CIS)": [
    "Systems Analysis and Design",
    "Enterprise Resource Planning",
    "Management Information Systems",
    "Business Intelligence",
    "Database Management System",
    "Information Security",
    "Computer Networks",
    "Introduction to Data Science",
  ],
  "Software Engineering": [
    "Software Requirements Engineering",
    "Software Design and Architecture",
    "Software Testing and Quality Assurance",
    "Software Project Management",
    "DevOps and Continuous Delivery",
    "Object Oriented Programming",
    "Object Oriented Programming II",
    "Mobile Application Design",
  ],
  "Agriculture": [
    "Introduction to Agronomy",
    "Soil Science",
    "Crop Physiology",
    "Plant Pathology",
    "Horticulture",
    "Agricultural Economics",
    "Irrigation and Water Management",
    "Post Harvest Technology",
  ],
};

export const COURSES: string[] = [
  "Algorithm",
  "Algorithms",
  "Art of Living",
  "Artificial Intelligence",
  "Bangladesh Studies",
  "Basic Electronics",
  "Basic Functional English and English Spoken",
  "Compiler Design",
  "Computer Architecture and Organization",
  "Computer Fundamentals",
  "Computer Graphics",
  "Computer Networks",
  "Data Communication",
  "Data Structures",
  "Database Management System",
  "Digital Electronics",
  "Digital Image Processing",
  "Digital Logic Design",
  "Discrete Mathematics",
  "Economics",
  "Electrical Circuits",
  "Electronic Devices and Circuits",
  "Embedded Systems and IoT",
  "Engineering Economics",
  "Engineering Mathematics",
  "Financial and Managerial Accounting",
  "Instrumentation and Control",
  "Introduction to Biology and Chemistry for Computation",
  "Introduction to Data Science",
  "Machine Learning",
  "Math for Computer Science",
  "Mathematics I",
  "Mathematics II",
  "Microprocessor and Microcontroller",
  "Microprocessor, Embedded Systems and IoT",
  "Mobile Application Design",
  "Natural Language Processing",
  "Numerical Methods",
  "Object Oriented Programming",
  "Operating Systems",
  "Physics I",
  "Physics II",
  "Programming and Problem Solving",
];

export function departmentOf(course: string): typeof DEPARTMENTS[number] {
  if (EEE_COURSES.has(course)) return "Electrical and Electronic Engineering";
  if (GENERAL_COURSES.has(course)) return "General Studies";
  return "Computer Science and Engineering";
}

export function coursesByDepartment(
  dept: typeof DEPARTMENTS[number],
): string[] {
  if (dept in EXTRA_DEPT_COURSES) return EXTRA_DEPT_COURSES[dept];
  return COURSES.filter((c) => departmentOf(c) === dept);
}

// --- Deterministic hashing / PRNG ------------------------------------

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SECTION_POOL = [
  "61_A", "61_B", "62_A", "62_B", "63_A", "63_B",
  "64_A", "64_B", "65_A", "66_A", "67_A", "68_A",
  "68_B", "69_A", "69_B", "70_A", "70_B",
];

// --- Teachers per course & sections per teacher-course ---------------

export function teachersForCourse(course: string): string[] {
  const rng = mulberry32(hash("teachers:" + course));
  const count = 6 + Math.floor(rng() * 2); // 6–7
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(rng() * FACULTY.length));
  }
  const result = Array.from(indices).map((i) => FACULTY[i]);
  if (course === "Object Oriented Programming" && !result.includes("Muhammad Abu Rayan")) {
    result[0] = "Muhammad Abu Rayan";
  }
  return result;
}

export function sectionsForTeacherCourse(
  teacher: string,
  course: string,
): string[] {
  const rng = mulberry32(hash(`sections:${teacher}|${course}`));
  const count = 2 + Math.floor(rng() * 2); // 2–3
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(rng() * SECTION_POOL.length));
  }
  const result = Array.from(indices)
    .map((i) => SECTION_POOL[i])
    .sort();
  if (teacher === "Muhammad Abu Rayan" && course === "Object Oriented Programming") {
    if (!result.includes("68_A")) {
      result.push("68_A");
    }
  }
  return result;
}

// --- Per-section analytics -------------------------------------------

// Realistic per-course topic banks. Each list is the ordered syllabus for the
// course; earlier items are typically covered first, later items are the ones
// most often still pending near the end of the semester.
const TOPIC_BANK: Record<string, string[]> = {
  "Algorithm": [
    "Asymptotic Notation", "Divide and Conquer", "Sorting Algorithms",
    "Greedy Methods", "Dynamic Programming", "Graph Algorithms",
    "Shortest Paths", "Minimum Spanning Trees", "Network Flow",
    "String Matching", "NP-Completeness", "Approximation Algorithms",
  ],
  "Algorithms": [
    "Asymptotic Notation", "Divide and Conquer", "Sorting Algorithms",
    "Greedy Methods", "Dynamic Programming", "Graph Algorithms",
    "Shortest Paths", "Minimum Spanning Trees", "Network Flow",
    "String Matching", "NP-Completeness", "Approximation Algorithms",
  ],
  "Data Structures": [
    "Arrays and Linked Lists", "Stacks and Queues", "Recursion",
    "Binary Trees", "Balanced BSTs", "Heaps and Priority Queues",
    "Hash Tables", "Graphs", "Tries", "Segment Trees", "Disjoint Sets",
    "B-Trees",
  ],
  "Operating Systems": [
    "OS Structure and System Calls", "Processes and Threads",
    "CPU Scheduling", "Synchronization", "Deadlocks",
    "Memory Management", "Virtual Memory", "File Systems",
    "I/O Systems", "Disk Scheduling", "Protection and Security",
    "Distributed Systems",
  ],
  "Database Management System": [
    "Relational Model", "SQL Fundamentals", "ER Modeling",
    "Normalization", "Indexing", "Transactions", "Concurrency Control",
    "Recovery", "Query Optimization", "NoSQL Databases",
    "Distributed Databases", "Data Warehousing",
  ],
  "Machine Learning": [
    "Supervised Learning", "Linear Regression", "Logistic Regression",
    "Decision Trees", "Support Vector Machines", "Neural Networks",
    "Regularization", "Clustering", "Dimensionality Reduction",
    "Ensemble Methods", "Model Evaluation", "Reinforcement Learning",
  ],
  "Artificial Intelligence": [
    "Intelligent Agents", "Uninformed Search", "Informed Search",
    "Adversarial Search", "Constraint Satisfaction",
    "Propositional Logic", "First-Order Logic", "Planning",
    "Knowledge Representation", "Probabilistic Reasoning",
    "Bayesian Networks", "Machine Learning Foundations",
  ],
  "Computer Networks": [
    "Network Models", "Physical Layer", "Data Link Layer",
    "Medium Access Control", "Network Layer and IP",
    "Routing Algorithms", "Transport Layer and TCP",
    "Congestion Control", "Application Layer Protocols",
    "Network Security", "Wireless Networks", "Software Defined Networking",
  ],
  "Data Communication": [
    "Signals and Encoding", "Analog and Digital Transmission",
    "Multiplexing", "Transmission Media", "Error Detection and Correction",
    "Data Link Protocols", "Framing", "Flow Control",
    "Switching Techniques", "Modulation Techniques",
    "Bandwidth Utilization", "Spread Spectrum",
  ],
  "Computer Architecture and Organization": [
    "Instruction Set Architecture", "Data Representation",
    "Arithmetic and Logic Unit", "Datapath and Control",
    "Pipelining", "Hazards and Forwarding", "Memory Hierarchy",
    "Cache Memory", "Virtual Memory", "I/O Organization",
    "Parallel Processing", "Multicore Architectures",
  ],
  "Computer Fundamentals": [
    "History of Computing", "Number Systems", "Boolean Algebra",
    "Computer Hardware", "Software Categories", "Operating Systems Basics",
    "Networking Basics", "Internet and Web", "Databases Overview",
    "Cybersecurity Basics", "Cloud Computing", "Emerging Technologies",
  ],
  "Compiler Design": [
    "Lexical Analysis", "Regular Expressions and Finite Automata",
    "Syntax Analysis", "Top-Down Parsing", "Bottom-Up Parsing",
    "Syntax Directed Translation", "Semantic Analysis",
    "Intermediate Code Generation", "Runtime Environments",
    "Code Optimization", "Code Generation", "Register Allocation",
  ],
  "Computer Graphics": [
    "Graphics Primitives", "Line and Circle Drawing", "2D Transformations",
    "Viewing and Clipping", "3D Transformations", "Projections",
    "Curves and Surfaces", "Hidden Surface Removal",
    "Illumination Models", "Shading", "Texture Mapping", "Ray Tracing",
  ],
  "Digital Image Processing": [
    "Image Fundamentals", "Image Sampling and Quantization",
    "Intensity Transformations", "Histogram Processing",
    "Spatial Filtering", "Frequency Domain Filtering",
    "Image Restoration", "Color Image Processing",
    "Wavelets and Multiresolution", "Image Compression",
    "Morphological Processing", "Image Segmentation",
  ],
  "Object Oriented Programming": [
    "Classes and Objects", "Encapsulation", "Constructors and Destructors",
    "Inheritance", "Polymorphism", "Abstraction",
    "Operator Overloading", "Templates and Generics",
    "Exception Handling", "File I/O", "STL Fundamentals",
    "Design Patterns Overview",
  ],
  "Object Oriented Programming II": [
    "Advanced Inheritance", "Virtual Functions and Dispatch",
    "Abstract Classes and Interfaces", "Multiple Inheritance",
    "Generic Programming", "Standard Template Library",
    "Smart Pointers", "Concurrency in OOP", "Design Patterns",
    "SOLID Principles", "Unit Testing", "Refactoring Techniques",
  ],
  "Programming and Problem Solving": [
    "Variables and Data Types", "Operators and Expressions",
    "Control Flow", "Functions", "Arrays", "Strings", "Pointers",
    "Structures", "File Handling", "Recursion", "Modular Programming",
    "Problem Solving Strategies",
  ],
  "Information Security": [
    "Security Principles", "Classical Cryptography",
    "Symmetric Key Cryptography", "Public Key Cryptography",
    "Hash Functions and MACs", "Digital Signatures",
    "Authentication Protocols", "Access Control",
    "Network Security", "Web Security", "Malware Analysis",
    "Security Policy and Risk Management",
  ],
  "Introduction to Data Science": [
    "Data Science Workflow", "Data Collection and Cleaning",
    "Exploratory Data Analysis", "Data Visualization",
    "Statistical Inference", "Probability Foundations",
    "Linear Models", "Classification Basics", "Clustering Basics",
    "Feature Engineering", "Model Evaluation", "Ethics in Data Science",
  ],
  "Data Mining and Machine Learning": [
    "Data Preprocessing", "Association Rule Mining",
    "Classification Techniques", "Decision Trees",
    "Bayesian Classifiers", "Clustering Algorithms",
    "Neural Networks", "Support Vector Machines",
    "Ensemble Methods", "Anomaly Outlier Detection",
    "Text Mining", "Web Mining",
  ],
  "Natural Language Processing": [
    "Text Preprocessing", "Tokenization and Normalization",
    "Language Models", "Part of Speech Tagging",
    "Named Entity Recognition", "Parsing and Grammar",
    "Word Embeddings", "Sequence Models",
    "Machine Translation", "Sentiment Analysis",
    "Transformer Architectures", "Question Answering",
  ],
  "Mobile Application Design": [
    "Mobile UI Principles", "Activity and Fragment Lifecycle",
    "Layouts and Navigation", "Data Persistence",
    "Networking and REST APIs", "Background Processing",
    "Push Notifications", "Location and Maps",
    "Sensors and Media", "Security in Mobile Apps",
    "Publishing and Distribution", "Performance Optimization",
  ],
  "Pervasive Computing": [
    "Pervasive Computing Concepts", "Context Awareness",
    "Wireless Sensor Networks", "RFID and NFC",
    "Middleware for Pervasive Systems", "Location Aware Services",
    "Smart Environments", "Human Computer Interaction",
    "Privacy and Security", "Mobile Cloud Computing",
    "Internet of Things", "Case Studies",
  ],
  "Basic Electronics": [
    "Semiconductor Physics", "Diodes and Applications",
    "Rectifier Circuits", "Zener Diodes and Voltage Regulation",
    "Bipolar Junction Transistors", "BJT Biasing",
    "Small Signal Analysis", "Field Effect Transistors",
    "Amplifier Configurations", "Operational Amplifiers",
    "Feedback and Oscillators", "Power Amplifiers",
  ],
  "Digital Electronics": [
    "Number Systems and Codes", "Boolean Algebra",
    "Logic Gates", "Combinational Circuit Design",
    "Karnaugh Maps", "Multiplexers and Decoders",
    "Adders and Subtractors", "Flip-Flops and Latches",
    "Counters", "Shift Registers", "Memory Devices",
    "Programmable Logic Devices",
  ],
  "Digital Logic Design": [
    "Number Systems", "Boolean Algebra and Simplification",
    "Combinational Logic", "Karnaugh Maps",
    "Arithmetic Circuits", "Decoders and Encoders",
    "Multiplexers and Demultiplexers", "Sequential Logic",
    "Flip-Flops", "Counters and Registers",
    "State Machines", "Memory and PLDs",
  ],
  "Electrical Circuits": [
    "Ohm's Law", "Series and Parallel Circuits",
    "Kirchhoff's Current Law (KCL)", "Kirchhoff's Voltage Law (KVL)",
    "Mesh Analysis", "Nodal Analysis", "Superposition Theorem",
    "Thevenin's Theorem", "Norton's Theorem",
    "Maximum Power Transfer", "RC and RL Transient Response",
    "Resonance in RLC Circuits", "Three-Phase Circuits",
  ],
  "Electronic Devices and Circuits": [
    "Semiconductor Fundamentals", "PN Junction Diodes",
    "Diode Applications", "Bipolar Junction Transistors",
    "Transistor Biasing", "Small Signal Models",
    "Field Effect Transistors", "MOSFET Operation",
    "Multistage Amplifiers", "Frequency Response",
    "Feedback Amplifiers", "Operational Amplifier Circuits",
  ],
  "Instrumentation and Control": [
    "Measurement Fundamentals", "Sensors and Transducers",
    "Signal Conditioning", "Data Acquisition",
    "Transfer Functions", "Time Domain Analysis",
    "Frequency Domain Analysis", "Stability Analysis",
    "Root Locus", "PID Controllers",
    "State Space Analysis", "Digital Control Systems",
  ],
  "Microprocessor and Microcontroller": [
    "8086 Architecture", "Instruction Set and Addressing Modes",
    "Assembly Language Programming", "Interrupt Handling",
    "Memory Interfacing", "I/O Interfacing", "8051 Architecture",
    "8051 Programming", "Timers and Counters",
    "Serial Communication", "ARM Cortex Overview",
    "Embedded Peripherals",
  ],
  "Microprocessor, Embedded Systems and IoT": [
    "Microprocessor Fundamentals", "Microcontroller Architectures",
    "Embedded C Programming", "Real Time Operating Systems",
    "Interrupts and Timers", "Serial Communication Protocols",
    "Sensor Interfacing", "Wireless Modules",
    "IoT Architecture", "MQTT and CoAP",
    "Cloud Integration", "Edge Computing",
  ],
  "Embedded Systems and IoT": [
    "Embedded System Design", "Microcontroller Selection",
    "Real Time Operating Systems", "Interrupts and Timers",
    "Sensor and Actuator Interfacing", "Communication Protocols",
    "Wireless Connectivity", "IoT Architecture",
    "MQTT and CoAP", "Cloud Platforms",
    "Security in IoT", "Edge and Fog Computing",
  ],
  "Discrete Mathematics": [
    "Logic and Propositions", "Set Theory", "Relations",
    "Functions", "Mathematical Induction", "Recurrence Relations",
    "Counting Principles", "Permutations and Combinations",
    "Graph Theory", "Trees", "Boolean Algebra",
    "Finite State Machines",
  ],
  "Mathematics I": [
    "Limits and Continuity", "Differentiation",
    "Applications of Derivatives", "Integration Techniques",
    "Definite Integrals", "Applications of Integration",
    "Sequences and Series", "Taylor and Maclaurin Series",
    "Partial Differentiation", "Multiple Integrals",
    "Vector Calculus", "Line and Surface Integrals",
  ],
  "Mathematics II": [
    "Matrices and Determinants", "Systems of Linear Equations",
    "Eigenvalues and Eigenvectors", "Vector Spaces",
    "Ordinary Differential Equations", "Higher Order ODEs",
    "Laplace Transforms", "Fourier Series",
    "Fourier Transforms", "Partial Differential Equations",
    "Complex Analysis", "Numerical Methods",
  ],
  "Math for Computer Science": [
    "Propositional Logic", "Predicate Logic", "Proof Techniques",
    "Set Theory", "Relations and Functions",
    "Counting and Combinatorics", "Probability Basics",
    "Discrete Probability", "Graph Theory",
    "Number Theory", "Linear Algebra Basics",
    "Algorithmic Complexity",
  ],
  "Engineering Mathematics": [
    "Linear Algebra", "Vector Spaces", "Eigenvalue Problems",
    "Differential Equations", "Laplace Transforms",
    "Fourier Analysis", "Complex Variables",
    "Probability Theory", "Statistical Inference",
    "Numerical Analysis", "Optimization Techniques",
    "Partial Differential Equations",
  ],
  "Numerical Methods": [
    "Error Analysis", "Root Finding Methods",
    "Bisection and Newton-Raphson", "Interpolation",
    "Lagrange and Newton Interpolation", "Numerical Differentiation",
    "Numerical Integration", "Simpson's and Trapezoidal Rules",
    "Solution of Linear Systems", "Gauss Elimination and LU",
    "Numerical Solution of ODEs", "Runge-Kutta Methods",
  ],
  "Physics I": [
    "Vectors and Kinematics", "Newton's Laws of Motion",
    "Work Energy and Power", "Momentum and Collisions",
    "Rotational Motion", "Gravitation",
    "Oscillations and Waves", "Sound Waves",
    "Fluid Mechanics", "Thermodynamics",
    "Kinetic Theory of Gases", "Heat Transfer",
  ],
  "Physics II": [
    "Electric Charges and Fields", "Gauss's Law",
    "Electric Potential", "Capacitance and Dielectrics",
    "Current and Resistance", "DC Circuits",
    "Magnetic Fields", "Ampere's and Faraday's Laws",
    "Electromagnetic Induction", "AC Circuits",
    "Electromagnetic Waves", "Optics and Interference",
  ],
  "Economics": [
    "Introduction to Economics", "Demand and Supply",
    "Elasticity", "Consumer Theory", "Production and Costs",
    "Market Structures", "Perfect Competition",
    "Monopoly and Oligopoly", "Factor Markets",
    "National Income Accounting", "Inflation and Unemployment",
    "Monetary and Fiscal Policy",
  ],
  "Engineering Economics": [
    "Time Value of Money", "Interest and Equivalence",
    "Present Worth Analysis", "Annual Worth Analysis",
    "Rate of Return Analysis", "Benefit Cost Analysis",
    "Depreciation and Taxes", "Inflation Effects",
    "Replacement Analysis", "Sensitivity and Risk",
    "Capital Budgeting", "Project Evaluation",
  ],
  "Financial and Managerial Accounting": [
    "Accounting Principles", "Recording Transactions",
    "Adjusting Entries", "Financial Statements",
    "Merchandising Operations", "Inventory Valuation",
    "Cash and Receivables", "Depreciation of Assets",
    "Cost Concepts and Behavior", "Job and Process Costing",
    "Budgeting", "Managerial Decision Making",
  ],
  "Bangladesh Studies": [
    "Geography of Bangladesh", "Language Movement",
    "Liberation War of 1971", "Post-Independence Reconstruction",
    "Constitution of Bangladesh", "Government Structure",
    "Economy of Bangladesh", "Rural Development",
    "Foreign Relations", "Culture and Heritage",
    "Population and Society", "Contemporary Issues",
  ],
  "Basic Functional English and English Spoken": [
    "Parts of Speech", "Sentence Structure",
    "Tenses in Context", "Common Grammar Errors",
    "Vocabulary Building", "Pronunciation",
    "Listening Skills", "Speaking Practice",
    "Reading Comprehension", "Paragraph Writing",
    "Formal and Informal Communication", "Presentation Skills",
  ],
  "Art of Living": [
    "Self Awareness", "Emotional Intelligence",
    "Stress Management", "Time Management",
    "Goal Setting", "Communication Skills",
    "Interpersonal Relationships", "Ethics and Values",
    "Leadership Basics", "Team Work",
    "Health and Wellbeing", "Mindfulness Practices",
  ],
  "Introduction to Biology and Chemistry for Computation": [
    "Cells and Biomolecules", "DNA RNA and Proteins",
    "Genetics Fundamentals", "Enzyme Kinetics",
    "Metabolism Overview", "Atomic Structure",
    "Chemical Bonding", "Reaction Kinetics",
    "Thermochemistry", "Organic Chemistry Basics",
    "Bioinformatics Foundations", "Computational Modeling",
  ],
};

export function courseTopics(course: string): string[] {
  return TOPIC_BANK[course] ?? [
    "Course Foundations", "Core Concepts", "Analytical Methods",
    "Applied Techniques", "Case Studies", "Advanced Applications",
    "Integration and Review",
  ];
}



export type SectionAnalytics = {
  name: string;
  coverage: number;
  weeksCovered: number;
  weeksTotal: number;
  coveredTopics: number;
  coveredTopicsList: string[];
  missingTopics: string[];
  weeklyPlan: { week: number; topic: string; status: "Completed" | "In Progress" | "Pending" }[];
  lastUpdated: string;
  aiConfidence: number;
  trend: number[];
  outcomes: { code: string; label: string; value: number }[];
  weeklyProgress: { week: number; status: "Completed" | "In Progress" | "Pending" }[];
  status: "On Schedule" | "Needs Attention" | "Delayed";
  currentWeek?: number;
};

function lastUpdatedLabel(days: number) {
  if (days <= 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const w = Math.round(days / 7);
  return w === 1 ? "1 week ago" : `${w} weeks ago`;
}

export function sectionAnalytics(
  teacher: string,
  course: string,
  section: string,
): SectionAnalytics {
  const rng = mulberry32(hash(`sec:${teacher}|${course}|${section}`));
  const weeksTotal = 14;
  const coverage = 55 + Math.floor(rng() * 41); // 55–95
  const weeksCovered = Math.round((coverage / 100) * weeksTotal);
  const topics = courseTopics(course);
  const missingCount = 2 + Math.floor(rng() * 4); // always 2–5
  const missingTopics = topics.slice(
    Math.max(0, topics.length - missingCount),
  );
  const coveredTopicsList = topics.slice(
    0,
    Math.max(0, topics.length - missingTopics.length),
  );
  const coveredTopics = coveredTopicsList.length;
  const aiConfidence = 85 + Math.floor(rng() * 14);
  const daysAgo = 1 + Math.floor(rng() * 9);

  // Trend: smooth growth to `coverage`
  const trend: number[] = [];
  for (let i = 0; i <= weeksTotal; i++) {
    const noise = (rng() - 0.5) * 3;
    const base = (coverage * i) / weeksTotal;
    trend.push(Math.max(0, Math.min(100, Math.round(base + noise))));
  }

  const outcomes = ["CO1", "CO2", "CO3", "CO4"].map((code, i) => ({
    code,
    label: `Learning Outcome ${i + 1}`,
    value: Math.max(
      40,
      Math.min(100, coverage - 10 + Math.floor(rng() * 20) + (i === 0 ? 5 : 0)),
    ),
  }));

  const weeklyProgress = Array.from({ length: weeksTotal }, (_, i) => {
    const w = i + 1;
    let status: "Completed" | "In Progress" | "Pending";
    if (w <= weeksCovered) status = "Completed";
    else if (w === weeksCovered + 1) status = "In Progress";
    else status = "Pending";
    return { week: w, status };
  });

  const weeklyPlan = weeklyProgress.map((w) => ({
    week: w.week,
    topic: topics[(w.week - 1) % topics.length],
    status: w.status,
  }));

  const status: SectionAnalytics["status"] =
    coverage >= 85 ? "On Schedule" : coverage >= 72 ? "Needs Attention" : "Delayed";

  return {
    name: `Section ${section}`,
    coverage,
    weeksCovered,
    weeksTotal,
    coveredTopics,
    coveredTopicsList,
    missingTopics,
    weeklyPlan,
    lastUpdated: lastUpdatedLabel(daysAgo),
    aiConfidence,
    trend,
    outcomes,
    weeklyProgress,
    status,
  };
}

