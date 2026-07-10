import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SelectField } from "@/components/select-field";
import { AnalysisLoader } from "@/components/analysis-loader";
import { Upload, FileBarChart, FileText } from "lucide-react";
import {
  DEPARTMENTS,
  coursesByDepartment,
  courseTopics,
} from "@/lib/academic-data";


export const Route = createFileRoute("/assessment")({
  head: () => ({
    meta: [{ title: "Assessment Intelligence — AICAS" }],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const [department, setDepartment] = useState<string>("");
  const [course, setCourse] = useState<string>("");
  const [assessment, setAssessment] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const courseOptions = useMemo(
    () =>
      department
        ? coursesByDepartment(department as typeof DEPARTMENTS[number])
        : [],
    [department],
  );

  const reset = () => {
    setFileName(null);
    setAnalyzing(false);
    setAnalyzed(false);
  };
  const onDept = (v: string) => {
    setDepartment(v);
    setCourse("");
    setAssessment("");
    reset();
  };
  const onCourse = (v: string) => {
    setCourse(v);
    setAssessment("");
    reset();
  };
  const onAssessment = (v: string) => {
    setAssessment(v);
    reset();
  };

  const canUpload = Boolean(department && course && assessment);


  return (
    <AppShell>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Quality Assurance
        </p>
        <h1 className="text-4xl font-semibold tracking-tighter">
          Assessment Intelligence
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Upload a question paper for an institutional evaluation of curriculum
          alignment, Bloom's Taxonomy classification, difficulty profile, and
          coverage against faculty and student materials.
        </p>
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
          label="Assessment"
          value={assessment}
          onChange={onAssessment}
          options={["Midterm", "Final"]}
          placeholder="Select Assessment"
          disabled={!course}
        />
      </div>

      {!canUpload ? (
        <div className="mt-8 rounded-2xl border bg-card shadow-sm p-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl border bg-background flex items-center justify-center">
            <Upload size={18} className="text-muted-foreground" />
          </div>
          <h3 className="mt-5 text-base font-semibold tracking-tight">
            Awaiting selection
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Select a department, course, and assessment type to upload a
            question paper for evaluation.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border bg-card shadow-sm p-10">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl border bg-background flex items-center justify-center">
              <Upload size={20} />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">
              Upload Original Question Paper
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Supported formats: PDF, DOCX, JPG, PNG. Text will be extracted
              and evaluated against the approved course curriculum.
            </p>

            <label className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-xl border bg-background text-sm font-medium cursor-pointer hover:bg-secondary transition-colors">
              <FileText size={15} />
              Choose file
              <input
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFileName(f.name);
                    setAnalyzed(false);
                  }
                }}
              />
            </label>

            {fileName && (
              <div className="mt-4 text-xs text-muted-foreground">
                Selected: <span className="text-foreground">{fileName}</span>
              </div>
            )}

            {fileName && !analyzing && !analyzed && (
              <button
                onClick={() => setAnalyzing(true)}
                className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors shadow-sm"
              >
                <FileBarChart size={15} />
                Run Evaluation
              </button>
            )}
          </div>
        </div>
      )}

      {analyzing && canUpload && (
        <div className="mt-8">
          <AnalysisLoader
            title="Evaluating Question Paper"
            messages={[
              "Reading uploaded question paper...",
              "Extracting text and structure...",
              "Comparing with curriculum...",
              "Classifying Bloom's Taxonomy levels...",
              "Assessing difficulty profile...",
              "Generating evaluation report...",
              "Finalizing...",
            ]}
            onDone={() => {
              setAnalyzing(false);
              setAnalyzed(true);
            }}
          />
        </div>
      )}

      {analyzed && canUpload && <AnalysisResults course={course} />}


    </AppShell>
  );
}

function AnalysisResults({ course }: { course: string }) {
  const topics = courseTopics(course);
  const splitPoint = Math.max(3, topics.length - 3);
  const detected = topics.slice(0, splitPoint).slice(0, 6);
  const missing = topics.slice(splitPoint);
  return (
    <div className="mt-10 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ScoreCard label="Assessment Quality Index" value={91} />
        <ScoreCard label="Curriculum Alignment" value={94} />
        <ScoreCard label="Learning Outcome Mapping" value={89} />
      </div>

      <div className="rounded-2xl border bg-card shadow-sm divide-y">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
          <Panel title="Topic Identification">
            <div className="flex flex-wrap gap-2">
              {detected.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-background"
                >
                  {t}
                </span>
              ))}
            </div>
          </Panel>
          <Panel title="Missing Curriculum Areas">
            <div className="flex flex-wrap gap-2">
              {missing.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-red-300 text-red-700 bg-red-50/40 px-3 py-1 text-xs font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </Panel>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
          <Panel title="Bloom's Taxonomy Classification">
            <div className="space-y-3">
              <Bar label="Remember" value={10} />
              <Bar label="Understand" value={20} />
              <Bar label="Apply" value={35} />
              <Bar label="Analyze" value={25} />
              <Bar label="Evaluate" value={10} />
            </div>
          </Panel>
          <Panel title="Difficulty Profile">
            <div className="space-y-3">
              <Bar label="Easy" value={20} tone="emerald" />
              <Bar label="Medium" value={50} tone="amber" />
              <Bar label="Hard" value={30} tone="red" />
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
          <Panel title="Coverage Against Materials">
            <div className="space-y-3">
              <Bar label="Coverage Against Faculty Materials" value={92} />
              <Bar label="Coverage Against Student Materials" value={81} />
              <Bar label="Coverage Against Curriculum" value={94} />
            </div>
          </Panel>
          <Panel title="Administrative Remarks">
            <ul className="space-y-2.5 text-sm">
              {[
                "Question paper reflects satisfactory alignment with the approved course outline.",
                "Include one additional question on Network Flow to complete curriculum coverage.",
                "Increase share of 'Evaluate' level questions from 10% to approximately 15% to strengthen higher-order assessment.",
                "Rebalance difficulty profile: reduce Hard questions by ~5% to fit the allotted examination time.",
              ].map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 rounded-full bg-foreground shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="rounded-2xl border bg-card shadow-sm p-6 flex items-center gap-5">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </div>
        <div className="mt-1 text-3xl font-semibold tracking-tighter tabular-nums">
          {value}
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 py-7">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        {title}
      </div>
      {children}
    </div>
  );
}

function Bar({
  label,
  value,
  tone = "foreground",
}: {
  label: string;
  value: number;
  tone?: "foreground" | "emerald" | "amber" | "red";
}) {
  const color =
    tone === "emerald"
      ? "bg-emerald-600"
      : tone === "amber"
        ? "bg-amber-600"
        : tone === "red"
          ? "bg-red-600"
          : "bg-foreground";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-foreground/80">{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={"h-full rounded-full transition-all " + color}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
