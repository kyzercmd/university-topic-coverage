import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SelectField } from "@/components/select-field";
import { AnalysisLoader } from "@/components/analysis-loader";
import { X, TrendingUp, FileBarChart } from "lucide-react";
import {
  DEPARTMENTS,
  coursesByDepartment,
  teachersForCourse,
  type SectionAnalytics,
} from "@/lib/academic-data";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [{ title: "Overview — AICAS" }],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const [department, setDepartment] = useState<string>("");
  const [course, setCourse] = useState<string>("");
  const [teacher, setTeacher] = useState<string>("");
  const [analyzed, setAnalyzed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);

  const courseOptions = useMemo(
    () =>
      department
        ? coursesByDepartment(department as typeof DEPARTMENTS[number])
        : [],
    [department],
  );
  const teacherOptions = useMemo(
    () => (course ? teachersForCourse(course) : []),
    [course],
  );

  const onDept = (v: string) => {
    setDepartment(v);
    setCourse("");
    setTeacher("");
    setAnalyzed(false);
  };
  const onCourse = (v: string) => {
    setCourse(v);
    setTeacher("");
    setAnalyzed(false);
  };
  const onTeacher = (v: string) => {
    setTeacher(v);
    setAnalyzed(false);
  };

  const ready = Boolean(department && course && teacher);
  
  const [sections, setSections] = useState<SectionAnalytics[]>([]);

  useEffect(() => {
    if (!ready) {
      setSections([]);
      return;
    }
    
    let ignore = false;
    setAnalyzed(false);

    async function fetchData() {
       try {
           const apiCourseId = course === "Object Oriented Programming" ? "CSE-221" : course;
           const res = await fetch(`http://localhost:8000/api/dashboard/faculty-overview?course_id=${encodeURIComponent(apiCourseId)}&faculty_id=${encodeURIComponent(teacher)}`);
           if (!res.ok) throw new Error("Failed to fetch");
           const data = await res.json();
           
           if (!ignore) {
               const mapped: SectionAnalytics[] = data.sections.map((sec: any) => {
                  const coverage = sec.coverage_percentage;
                  const [weeksCoveredStr, weeksTotalStr] = sec.weeks_covered_str.split('/');
                  const weeksCovered = parseInt(weeksCoveredStr, 10) || 0;
                  const weeksTotal = parseInt(weeksTotalStr, 10) || 14;
                  const status = coverage >= 85 ? "On Schedule" : coverage >= 72 ? "Needs Attention" : "Delayed";
                  
                  const totalTopics = sec.covered_topics_count + sec.pending_topics_count;
                  const trend = [0];
                  let acc = 0;
                  for (let i = 1; i <= weeksTotal; i++) {
                      const w = sec.weekly_progress.find((w: any) => w.week_number === i);
                      if (w) acc += w.topic_names.length;
                      trend.push(Math.round((acc / (totalTopics || 1)) * 100));
                  }
                  const outcomes = ["CO1", "CO2", "CO3", "CO4"].map((code, i) => ({
                      code,
                      label: `Learning Outcome ${i + 1}`,
                      value: Math.max(40, Math.min(100, coverage - 10 + i * 5))
                  }));
                  
                  const weeklyPlan = sec.weekly_progress.flatMap((w: any) => 
                      w.topic_names.map((t: string) => ({
                          week: w.week_number === "Unassigned" ? 0 : Number(w.week_number),
                          topic: t,
                          status: w.completed ? "Completed" : "Pending"
                      }))
                  );

                  return {
                      name: sec.section_name || `Section ${sec.section_id}`,
                      coverage,
                      weeksCovered,
                      weeksTotal,
                      coveredTopics: sec.covered_topics_count,
                      coveredTopicsList: [],
                      missingTopics: sec.missing_topics,
                      weeklyPlan,
                      lastUpdated: "Just now",
                      aiConfidence: sec.confidence_score,
                      trend,
                      outcomes,
                      weeklyProgress: sec.weekly_progress.map((w: any) => ({
                          week: w.week_number === "Unassigned" ? 0 : Number(w.week_number),
                          status: w.completed ? "Completed" : "Pending"
                      })),
                      status,
                      currentWeek: sec.current_week
                  } as SectionAnalytics;
               });
               setSections(mapped);
           }
       } catch (err) {
           console.error("Failed to fetch dashboard data:", err);
       }
    }
    fetchData();
    return () => { ignore = true; };
  }, [teacher, course, ready]);

  useEffect(() => {
    if (!showSummary) setSummaryReady(false);
  }, [showSummary]);

  const summary = useMemo(() => {
    if (sections.length === 0) return null;
    const avg = Math.round(
      sections.reduce((s, x) => s + x.coverage, 0) / sections.length,
    );
    const totalMissing = sections.reduce((s, x) => s + x.missingTopics.length, 0);
    const overall = Math.round(
      sections.reduce((s, x) => s + x.coverage * x.weeksTotal, 0) /
        sections.reduce((s, x) => s + x.weeksTotal, 0),
    );
    return { avg, totalMissing, overall };
  }, [sections]);

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            2026 Summer Semester
          </p>
          <h1 className="text-4xl font-semibold tracking-tighter">Overview</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Institutional curriculum coverage analytics across departments,
            courses, and faculty.
          </p>
        </div>
        {ready && analyzed && sections.length > 0 && (
          <button
            onClick={() => setShowSummary(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border bg-foreground text-background px-5 text-sm font-medium transition-colors hover:bg-foreground/90 shadow-sm"
          >
            <FileBarChart size={15} />
            Executive Teaching Overview
          </button>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
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
          label="Faculty"
          value={teacher}
          onChange={onTeacher}
          options={teacherOptions}
          placeholder="Select Faculty"
          disabled={!course}
        />
      </div>

      {!ready ? (
        <EmptyState />
      ) : !analyzed ? (
        <div className="mt-14">
          <AnalysisLoader
            title="Generating Curriculum Analytics"
            onDone={() => setAnalyzed(true)}
          />
        </div>
      ) : (
        <div className="mt-14 space-y-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">{teacher}</h2>
            <p className="text-sm text-muted-foreground">
              {sections.length} section{sections.length === 1 ? "" : "s"} ·{" "}
              {course}
            </p>
          </div>

          {sections.map((s) => (
            <SectionCard key={s.name} section={s} />
          ))}
        </div>
      )}

      {showSummary && summary && !summaryReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl">
            <AnalysisLoader
              title="Preparing Executive Overview"
              messages={[
                "Aggregating section analytics...",
                "Computing curriculum coverage...",
                "Compiling administrative recommendations...",
                "Finalizing report...",
              ]}
              onDone={() => setSummaryReady(true)}
            />
          </div>
        </div>
      )}
      {showSummary && summary && summaryReady && (
        <SummaryModal
          teacher={teacher}
          course={course}
          summary={summary}
          sections={sections}
          onClose={() => setShowSummary(false)}
        />
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="mt-14 rounded-2xl border bg-card shadow-sm p-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-xl border bg-background flex items-center justify-center">
        <TrendingUp size={18} className="text-muted-foreground" />
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-tight">
        Awaiting selection
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        Select a department, course, and faculty member to generate curriculum
        analytics.
      </p>
    </div>
  );
}


function statusTone(status: SectionAnalytics["status"]) {
  if (status === "On Schedule")
    return "border-emerald-300 text-emerald-700 bg-emerald-50/50";
  if (status === "Needs Attention")
    return "border-amber-300 text-amber-700 bg-amber-50/50";
  return "border-red-300 text-red-700 bg-red-50/50";
}

function SectionCard({ section }: { section: SectionAnalytics }) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="px-8 py-6 border-b flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {section.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last updated {section.lastUpdated} · Analytical confidence{" "}
            {section.aiConfidence}%
          </p>
        </div>
        <span
          className="text-[11px] font-medium text-blue-700 bg-blue-50/50 px-2.5 py-1 rounded-full border border-blue-300"
        >
          Week {section.currentWeek || 1}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 border-b">
        <Kpi label="Coverage" value={`${section.coverage}%`} />
        <Kpi
          label="Weeks Covered"
          value={`${section.weeksCovered}/${section.weeksTotal}`}
        />
        <Kpi label="Covered Topics" value={String(section.coveredTopics)} />
        <Kpi
          label="Pending Topics"
          value={String(section.missingTopics.length)}
        />
        <Kpi label="Confidence" value={`${section.aiConfidence}%`} />
      </div>

      <div className="px-8 py-7 border-b">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Coverage Trend
        </div>
        <div className="mt-4">
          <LineChart data={section.trend} />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>Week 1</span>
          <span>Week {section.weeksTotal}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
        <div className="px-8 py-7">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Weekly Teaching Progress
          </div>
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {section.weeklyPlan.map((w, idx) => (
              <li
                key={`${w.week}-${w.topic}-${idx}`}
                className="flex items-start justify-between gap-3 py-1"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {w.week === 0 ? "Pending Topic" : `Week ${w.week}`}
                  </div>
                  <div className="mt-0.5 text-sm font-medium truncate">
                    {w.topic}
                  </div>
                </div>
                <span
                  className={
                    "shrink-0 text-[11px] font-medium mt-1 " +
                    (w.status === "Completed"
                      ? "text-emerald-700"
                      : w.status === "In Progress"
                        ? "text-amber-700"
                        : "text-muted-foreground")
                  }
                >
                  {w.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-8 py-7">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Missing Topics
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {section.missingTopics.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-red-300 text-red-700 bg-red-50/40 px-3 py-1 text-xs font-medium"
              >
                {t}
              </span>
            ))}
            {section.missingTopics.length === 0 && (
              <span className="text-xs text-muted-foreground">
                All curriculum topics currently covered.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-5">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}

function LineChart({ data }: { data: number[] }) {
  const w = 480;
  const h = 120;
  const pad = 8;
  const max = 100;
  const step = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-28"
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2} fill="currentColor" />
      ))}
    </svg>
  );
}

function SummaryModal({
  teacher,
  course,
  summary,
  sections,
  onClose,
}: {
  teacher: string;
  course: string;
  summary: {
    avg: number;
    totalMissing: number;
    overall: number;
  };
  sections: SectionAnalytics[];
  onClose: () => void;
}) {
  const laggingSection = [...sections].sort((a, b) => a.coverage - b.coverage)[0];
  const variance =
    Math.max(...sections.map((x) => x.coverage)) -
    Math.min(...sections.map((x) => x.coverage));

  const remarks: string[] = [];
  if (variance <= 10) {
    remarks.push(
      "Coverage remains consistent across all assigned sections of this course.",
    );
  } else {
    remarks.push(
      `Coverage variance of ${variance}% observed between sections; instructional pacing is uneven.`,
    );
  }
  if (laggingSection && laggingSection.coverage < 85) {
    remarks.push(
      `${laggingSection.name} is approximately ${Math.max(1, laggingSection.weeksTotal - laggingSection.weeksCovered - 1)} instructional week(s) behind the expected academic calendar.`,
    );
  }
  if (summary.totalMissing > 0) {
    remarks.push(
      `${summary.totalMissing} curriculum topic${summary.totalMissing === 1 ? "" : "s"} remain pending before the next assessment window.`,
    );
  }
  remarks.push(
    summary.overall >= 85
      ? "Current delivery indicates satisfactory curriculum alignment with the approved course plan."
      : "Additional instructional coverage is recommended prior to the next assessment checkpoint.",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-8 py-6 border-b">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Executive Teaching Overview
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight">
              {teacher}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{course}</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-y md:divide-y-0 border-b">
          <Kpi label="Overall Curriculum Coverage" value={`${summary.overall}%`} />
          <Kpi label="Average Completion" value={`${summary.avg}%`} />
          <Kpi label="Pending Topics" value={String(summary.totalMissing)} />
        </div>

        <div className="px-8 py-6 border-b">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Section Comparison
          </div>
          <div className="space-y-3">
            {sections.map((s) => (
              <div key={s.name} className="flex items-center gap-4">
                <div className="w-32 text-sm">{s.name}</div>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all"
                    style={{ width: `${s.coverage}%` }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium tabular-nums">
                  {s.coverage}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="text-xs font-medium uppercase tracking-wider mb-3">
            Administrative Recommendation
          </div>
          <ul className="space-y-2.5 text-sm text-foreground/85 leading-relaxed">
            {remarks.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 h-1 w-1 rounded-full bg-foreground shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
