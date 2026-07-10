import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SelectField } from "@/components/select-field";
import { AnalysisLoader } from "@/components/analysis-loader";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import {
  DEPARTMENTS,
  coursesByDepartment,
  teachersForCourse,
  sectionsForTeacherCourse,
  sectionAnalytics,
} from "@/lib/academic-data";


export const Route = createFileRoute("/course-outline")({
  head: () => ({
    meta: [{ title: "Course Materials — AICAS" }],
  }),
  component: CourseMaterialsPage,
});

function CourseMaterialsPage() {
  const [tab, setTab] = useState<"view" | "upload">("view");

  return (
    <AppShell>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Curriculum</p>
        <h1 className="text-4xl font-semibold tracking-tighter">
          Course Materials
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Review the official course outline or upload new instructional
          materials.
        </p>
      </div>

      <div className="mt-8 inline-flex rounded-xl border bg-card p-1 shadow-sm">
        {(
          [
            ["view", "View Materials"],
            ["upload", "Upload Materials"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors " +
              (tab === k
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "view" ? <ViewMaterials /> : <UploadMaterials />}
    </AppShell>
  );
}

function ViewMaterials() {
  const [department, setDepartment] = useState<string>("");
  const [course, setCourse] = useState<string>("");
  const [teacher, setTeacher] = useState<string>("");
  const [analyzed, setAnalyzed] = useState(false);

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

  const rep = useMemo(() => {
    if (!ready) return null;
    const s = sectionsForTeacherCourse(teacher, course)[0];
    return s ? sectionAnalytics(teacher, course, s) : null;
  }, [teacher, course, ready]);

  const weeks: [string, string, boolean][] = rep
    ? rep.weeklyPlan.map((w) => [
        `Week ${w.week}`,
        w.topic,
        w.status === "Completed",
      ])
    : [];

  const covered = weeks.filter(([, , c]) => c).length;
  const coverage = weeks.length
    ? Math.round((covered / weeks.length) * 100)
    : 0;

  return (
    <>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
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
        <div className="mt-14 rounded-2xl border bg-card shadow-sm p-16 text-center">
          <p className="text-sm text-muted-foreground">
            Choose a department, course, and faculty member to view the
            official course outline.
          </p>
        </div>
      ) : !analyzed || !rep ? (
        <div className="mt-8">
          <AnalysisLoader
            title="Retrieving Course Materials"
            messages={[
              "Loading course information...",
              "Retrieving curriculum...",
              "Compiling weekly plan...",
              "Preparing outline...",
            ]}
            onDone={() => setAnalyzed(true)}
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-0 rounded-2xl border bg-card shadow-sm divide-x divide-y md:divide-y-0 overflow-hidden">
            <Meta label="Faculty" value={teacher} />
            <Meta label="Semester" value="2026 Summer" />
            <Meta label="Last Updated" value={rep.lastUpdated} />
            <Meta label="Course Coverage" value={`${coverage}%`} />
            <Meta
              label="Curriculum Progress"
              value={`${covered}/${weeks.length} wks`}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <MiniStat
              label="Outcome Completion"
              value={`${Math.round(
                rep.outcomes.reduce((a, o) => a + o.value, 0) /
                  rep.outcomes.length,
              )}%`}
            />
            <MiniStat
              label="Topic Distribution"
              value={`${rep.coveredTopics} covered · ${rep.missingTopics.length} pending`}
            />
            <MiniStat label="Curriculum Status" value={rep.status} />
          </div>

          <div className="mt-10 rounded-2xl border bg-card shadow-sm divide-y">
            <Section title="Course Objectives">
              <p>
                This course develops rigorous understanding of core concepts,
                analytical methods, and applied practice aligned with the
                approved university curriculum. Learners are expected to reach
                the defined course outcomes through structured lectures,
                assignments, laboratory work, and formative assessments.
              </p>
            </Section>

            <Section title="Course Outcomes">
              <ol className="list-decimal pl-5 space-y-2 marker:text-muted-foreground">
                {rep.outcomes.map((o) => (
                  <li key={o.code}>
                    <span className="font-medium">{o.code}.</span> {o.label} —
                    achievement {o.value}%.
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Weekly Plan">
              <ul className="divide-y">
                {weeks.map(([week, topic, done]) => (
                  <li
                    key={week}
                    className="py-3 flex items-center gap-6 first:pt-0 last:pb-0"
                  >
                    <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {week}
                    </span>
                    <span className="text-sm flex-1">{topic}</span>
                    <span
                      className={
                        "text-[11px] font-medium px-2 py-0.5 rounded-full border " +
                        (done
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50/50"
                          : "border-amber-300 text-amber-700 bg-amber-50/50")
                      }
                    >
                      {done ? "Covered" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Assessment Methods">
              <ul className="divide-y">
                {[
                  ["Class Attendance and Participation", "5%"],
                  ["Assignments and Problem Sets", "15%"],
                  ["Laboratory Work", "20%"],
                  ["Midterm Examination", "25%"],
                  ["Final Examination", "35%"],
                ].map(([item, weight]) => (
                  <li
                    key={item}
                    className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                  >
                    <span className="text-sm">{item}</span>
                    <span className="text-sm font-medium tabular-nums">
                      {weight}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </>
      )}
    </>
  );
}

function UploadMaterials() {
  const [department, setDepartment] = useState<string>("");
  const [course, setCourse] = useState<string>("");
  const [teacher, setTeacher] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

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
    resetUpload();
  };
  const onCourse = (v: string) => {
    setCourse(v);
    setTeacher("");
    resetUpload();
  };
  const onTeacher = (v: string) => {
    setTeacher(v);
    resetUpload();
  };
  const resetUpload = () => {
    setFiles([]);
    setUploading(false);
    setUploaded(false);
  };

  useEffect(() => {
    if (!uploaded) return;
    const t = setTimeout(() => {
      setUploaded(false);
      setFiles([]);
    }, 4000);
    return () => clearTimeout(t);
  }, [uploaded]);

  const ready = Boolean(department && course && teacher);

  return (
    <>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
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
        <div className="mt-14 rounded-2xl border bg-card shadow-sm p-16 text-center">
          <p className="text-sm text-muted-foreground">
            Select a department, course, and faculty member to upload
            instructional materials.
          </p>
        </div>
      ) : uploading ? (
        <div className="mt-8">
          <AnalysisLoader
            title="Uploading Materials"
            messages={[
              "Preparing files...",
              "Uploading to institutional repository...",
              "Indexing content...",
              "Registering with curriculum...",
              "Finalizing...",
            ]}
            onDone={() => {
              setUploading(false);
              setUploaded(true);
            }}
          />
        </div>
      ) : uploaded ? (
        <div className="mt-8 rounded-2xl border bg-card shadow-sm p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl border bg-background flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="mt-5 text-base font-semibold tracking-tight">
            Materials uploaded successfully.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Instructional materials are now available for review.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border bg-card shadow-sm p-10">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl border bg-background flex items-center justify-center">
              <Upload size={20} />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">
              Upload Materials
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Supported: PDF, DOCX, PPT, PPTX, ZIP. Maximum size 100 MB.
            </p>

            <label className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-xl border bg-background text-sm font-medium cursor-pointer hover:bg-secondary transition-colors">
              <FileText size={15} />
              Choose Files
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.ppt,.pptx,.zip"
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files;
                  if (list && list.length) setFiles(Array.from(list));
                }}
              />
            </label>

            {files.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                {files.map((f) => (
                  <div key={f.name}>
                    <span className="text-foreground">{f.name}</span>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <button
                onClick={() => setUploading(true)}
                className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors shadow-sm"
              >
                <Upload size={15} />
                Upload
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}


function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm px-6 py-5">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1.5 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-5">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-medium truncate">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-8 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
      <h2 className="text-sm font-semibold tracking-tight md:col-span-1">
        {title}
      </h2>
      <div className="md:col-span-3 text-sm text-foreground/85 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
