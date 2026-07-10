import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SelectField } from "@/components/select-field";
import { AnalysisLoader } from "@/components/analysis-loader";
import {
  GraduationCap,
  Users,
  Send,
  ArrowLeft,
  FileText,
  CheckCircle2,
} from "lucide-react";
import {
  DEPARTMENTS,
  coursesByDepartment,
  teachersForCourse,
  sectionsForTeacherCourse,
  courseTopics,
  COURSES,
  FACULTY,
} from "@/lib/academic-data";

const WEEK_OPTIONS = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`);

export const Route = createFileRoute("/submission")({
  head: () => ({
    meta: [{ title: "Submission — AICAS" }],
  }),
  component: SubmissionPage,
});

type Mode = null | "student" | "faculty";

function SubmissionPage() {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <AppShell>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Communications</p>
        <h1 className="text-4xl font-semibold tracking-tighter">Submission</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Distribute weekly submission forms and collect responses from
          students and faculty.
        </p>
      </div>

      {!mode && (
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChoiceCard
            title="Student"
            description="Send weekly submission forms and review uploaded student notes."
            icon={GraduationCap}
            onClick={() => setMode("student")}
          />
          <ChoiceCard
            title="Faculty"
            description="Review faculty records and request curriculum or course updates."
            icon={Users}
            onClick={() => setMode("faculty")}
          />
        </div>
      )}

      {mode === "student" && <StudentFlow onBack={() => setMode(null)} />}
      {mode === "faculty" && <FacultyFlow onBack={() => setMode(null)} />}
    </AppShell>
  );
}

function ChoiceCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: typeof GraduationCap;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-foreground/20"
    >
      <div className="h-12 w-12 rounded-xl border bg-background flex items-center justify-center">
        <Icon size={20} />
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      <div className="mt-6 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
        Continue →
      </div>
    </button>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft size={14} /> Back
    </button>
  );
}

function StudentFlow({ onBack }: { onBack: () => void }) {
  const [department, setDepartment] = useState<string>("");
  const [course, setCourse] = useState<string>("");
  const [assessment, setAssessment] = useState<string>("");
  const [tab, setTab] = useState<"submission" | "responses">("submission");
  const [responsesReady, setResponsesReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const courseOptions = useMemo(
    () =>
      department
        ? coursesByDepartment(department as typeof DEPARTMENTS[number])
        : [],
    [department],
  );

  const onDept = (v: string) => {
    setDepartment(v);
    setCourse("");
    setAssessment("");
    setResponsesReady(false);
  };
  const onCourse = (v: string) => {
    setCourse(v);
    setAssessment("");
    setResponsesReady(false);
  };
  const onAssessment = (v: string) => {
    setAssessment(v);
    setResponsesReady(false);
  };
  const onTab = (t: "submission" | "responses") => {
    setTab(t);
    if (t === "responses") setResponsesReady(false);
  };

  const ready = Boolean(department && course && assessment);

  return (
    <div className="mt-10 space-y-8">
      <BackButton onBack={onBack} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SelectField
          label="Department"
          value={department}
          onChange={onDept}
          options={[...DEPARTMENTS]}
          placeholder="Select Department"
        />
        <SelectField
          label="Course"
          value={course}
          onChange={onCourse}
          options={courseOptions}
          placeholder="Select Course"
          disabled={!department}
        />
        <SelectField
          label="Week"
          value={assessment}
          onChange={onAssessment}
          options={WEEK_OPTIONS}
          placeholder="Select Week"
          disabled={!course}
        />
      </div>

      {!ready ? (
        <div className="rounded-2xl border bg-card shadow-sm p-16 text-center">
          <p className="text-sm text-muted-foreground">
            Select a department, course, and week to distribute submission
            forms or review student uploads.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="flex border-b">
            {(["submission", "responses"] as const).map((t) => (
              <button
                key={t}
                onClick={() => onTab(t)}
                className={
                  "px-6 py-4 text-sm font-medium capitalize border-b-2 transition-colors " +
                  (tab === t
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "submission" ? (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl border bg-background flex items-center justify-center">
                <Send size={20} />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">
                Send {assessment} Submission Form
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Distribute the weekly material submission form to all enrolled
                students in this course.
              </p>
              <button
                onClick={async () => {
                  setSent(false);
                  setSending(true);
                  try {
                    const apiCourseId = course === "Object Oriented Programming" ? "CSE-221" : course;
                    await fetch("http://localhost:8000/dispatch-forms", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        course_id: apiCourseId,
                        week: assessment,
                      }),
                    });
                  } catch (err) {
                    console.error("Failed to dispatch form", err);
                  }
                }}
                disabled={sending}
                className="mt-6 h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors shadow-sm disabled:opacity-60"
              >
                Send Form
              </button>
            </div>
          ) : !responsesReady ? (
            <AnalysisLoader
              title="Loading Student Submissions"
              messages={[
                "Fetching student uploads...",
                "Reading uploaded notes...",
                "Running OCR on scans...",
                "Preparing gallery...",
              ]}
              onDone={() => setResponsesReady(true)}
            />
          ) : (
            <ResponsesGallery course={course} />
          )}
        </div>
      )}

      {sending && (
        <SendFormAnimation
          onDone={() => {
            setSending(false);
            setSent(true);
          }}
        />
      )}

      {sent && (
        <SentToast onClose={() => setSent(false)} />
      )}
    </div>
  );
}

function SendFormAnimation({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl">
        <AnalysisLoader
          title="Distributing Submission Forms"
          messages={[
            "Sending Forms...",
            "Sending Emails...",
            "Delivering...",
            "Forms Successfully Sent",
          ]}
          onDone={onDone}
        />
      </div>
    </div>
  );
}

function SentToast({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="flex items-start gap-3 rounded-xl border bg-card shadow-lg px-5 py-4 max-w-sm">
        <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-semibold tracking-tight">
            Forms Successfully Sent
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Emails sent successfully to all enrolled students.
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}


function ResponsesGallery({ course }: { course: string }) {
  const topics = courseTopics(course);
  const submissions = Array.from({ length: 9 }).map((_, i) => ({
    id: `S-${221001 + i * 37}`,
    time: `${18 + (i % 10)} Nov 2026, ${(9 + (i % 8)).toString().padStart(2, "0")}:${((i * 13) % 60).toString().padStart(2, "0")}`,
    ocr: 92 + ((i * 3) % 8),
    pages: 6 + ((i * 5) % 18),
    summary: `Handwritten notes covering ${topics[i % topics.length]} with worked examples and annotated diagrams.`,
  }));

  return (
    <div className="px-8 py-7">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Uploaded Student Notes
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {submissions.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border bg-background p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Student ID
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums">
                  {s.id}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50/50 px-2 py-0.5 text-[11px] font-medium">
                OCR {s.ocr}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <div className="text-muted-foreground uppercase tracking-wider">
                  Submitted
                </div>
                <div className="mt-0.5 text-foreground/85">{s.time}</div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wider">
                  Detected Pages
                </div>
                <div className="mt-0.5 text-foreground/85 tabular-nums">
                  {s.pages}
                </div>
              </div>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
              {s.summary}
            </p>
            <button className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline">
              <FileText size={12} /> View Notes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


function buildFacultyRoster() {
  return FACULTY.slice(0, 12).map((name, i) => {
    const course =
      COURSES.find((c) => teachersForCourse(c).includes(name)) ?? COURSES[i % COURSES.length];
    const sections = sectionsForTeacherCourse(name, course);
    return {
      id: `F-${2100 + i + 1}`,
      name,
      course,
      sections: sections.length,
    };
  });
}

function FacultyFlow({ onBack }: { onBack: () => void }) {
  const roster = useMemo(buildFacultyRoster, []);
  return (
    <div className="mt-10 space-y-8">
      <BackButton onBack={onBack} />

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <Th>Faculty ID</Th>
              <Th>Name</Th>
              <Th>Course</Th>
              <Th className="text-right">Sections</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roster.map((f) => (
              <tr key={f.id} className="hover:bg-secondary/40 transition-colors">
                <Td className="font-medium tabular-nums">{f.id}</Td>
                <Td>{f.name}</Td>
                <Td className="text-muted-foreground">{f.course}</Td>
                <Td className="text-right tabular-nums">{f.sections}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        <button className="h-11 px-5 rounded-xl border bg-card text-sm font-medium hover:bg-secondary transition-colors">
          Modify Course Information
        </button>
        <button className="h-11 px-5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors shadow-sm">
          Request Updated Curriculum
        </button>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={
        "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider " +
        className
      }
    >
      {children}
    </th>
  );
}
function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={"px-6 py-4 " + className}>{children}</td>;
}
