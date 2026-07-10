"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileEntry {
  file: File;
  preview: string;
  progress: number;
  status: UploadStatus;
  error?: string;
}

// ---------------------------------------------------------------------------
// Inner page
// ---------------------------------------------------------------------------
function UploadPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [submissionState, setSubmissionState] = useState<"idle" | "processing" | "success">("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [courseInfo, setCourseInfo] = useState<{
    course_id: string;
    course_name: string;
    target_week: string;
    semester_id: string;
    section_id: string;
  } | null>(null);
  const [pageState, setPageState] = useState<"loading" | "ready" | "invalid" | "used">("loading");

  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`http://localhost:8000/verify-token/${token}`);
        if (res.status === 404) {
          setPageState("invalid");
        } else if (res.status === 403) {
          setPageState("used");
        } else if (res.ok) {
          const data = await res.json();
          setCourseInfo(data);
          setPageState("ready");
        } else {
          setPageState("invalid");
        }
      } catch (err) {
        console.error(err);
        setPageState("invalid");
      }
    };
    
    verifyToken();
  }, [token]);

  const updateEntry = useCallback(
    (index: number, patch: Partial<FileEntry>) =>
      setEntries((prev) =>
        prev.map((e, i) => (i === index ? { ...e, ...patch } : e))
      ),
    []
  );

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: FileEntry[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "idle",
    }));
    setEntries((prev) => [...prev, ...next]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (!token || entries.length === 0) return;

    setSubmissionState("processing");
    setApiError(null);
    const publicUrls: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const { file } = entries[i];
      updateEntry(i, { status: "uploading", progress: 10 });

      // Build a unique storage path: notes/<token>/<timestamp>_<filename>
      const path = `${token}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("notes")
        .upload(path, file, { upsert: false });

      if (error) {
        updateEntry(i, { status: "error", progress: 0, error: error.message });
        continue;
      }

      updateEntry(i, { progress: 80 });

      // Retrieve the public URL
      const { data } = supabase.storage.from("notes").getPublicUrl(path);
      updateEntry(i, { status: "success", progress: 100 });
      publicUrls.push(data.publicUrl);
    }

    try {
      const res = await fetch("http://localhost:8000/process-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseInfo?.course_id,
          semester_id: courseInfo?.semester_id,
          section_id: courseInfo?.section_id,
          file_urls: publicUrls,
          week_number: courseInfo?.target_week ? parseInt(courseInfo.target_week.replace("Week ", "")) : 1,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setApiError(errData.error || "Failed to process notes on the server.");
        setSubmissionState("idle");
      } else {
        setSubmissionState("success");
      }
    } catch (err: any) {
      setApiError(err.message || "Network error while contacting server.");
      setSubmissionState("idle");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <Loader2 className="h-10 w-10 text-zinc-900 animate-spin" />
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-zinc-900">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center">
          <X className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
          <p className="text-zinc-500 text-sm">
            Invalid or missing upload link.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "used") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-zinc-900">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center">
          <X className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h1 className="text-xl font-semibold mb-2">Link Expired</h1>
          <p className="text-zinc-500 text-sm">
            This upload link has already been used.
          </p>
        </div>
      </div>
    );
  }

  if (submissionState === "success") {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8 text-zinc-900 font-sans">
        {/* Brand Header */}
        <div className="mb-12 text-center max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight mb-2 uppercase">AICAS</h2>
          <p className="text-zinc-500 text-sm tracking-wide uppercase">
            Academic Intelligence & Curriculum Analytics System
          </p>
        </div>
        
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-zinc-200 p-12 text-center">
          <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-zinc-900" />
          <p className="text-lg text-zinc-900 font-medium mb-10 leading-relaxed">
            Thank you for your submission! Your notes for {courseInfo?.target_week} of this semester have been successfully received.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8 text-zinc-900 font-sans">
      
      {/* Brand Header */}
      <div className="mb-10 text-center max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight mb-2">AICAS</h2>
        <p className="text-zinc-500 text-sm tracking-wide uppercase font-medium">
          Academic Intelligence & Curriculum Analytics System
        </p>
      </div>

      {/* Main Card */}
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 sm:p-12">
        <h1 className="text-2xl font-semibold mb-3 text-center">
          Submit your class notes for: {courseInfo?.target_week} of this semester
        </h1>
        <p className="text-center text-zinc-600 mb-8 text-sm sm:text-base leading-relaxed">
          <span className="font-semibold text-zinc-900">{courseInfo?.course_name} ({courseInfo?.course_id})</span>
        </p>

        {/* Drop Zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`
            relative cursor-pointer rounded-xl border-2 border-dashed p-12
            flex flex-col items-center justify-center gap-4 transition-all duration-200
            ${dragging
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-100"
            }
          `}
        >
          <div className="p-3 bg-white border border-zinc-200 rounded-full shadow-sm mb-2">
            <CloudUpload className="h-6 w-6 text-zinc-700" />
          </div>
          <p className="text-zinc-700 font-medium text-center">
            Drag & drop images of your notes, or <span className="underline underline-offset-4 decoration-zinc-400">click to browse</span>.
          </p>
          <p className="text-sm text-zinc-500">Multiple images are supported.</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* File List */}
        {entries.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4 uppercase tracking-wider">
              Selected Files ({entries.length})
            </h3>
            <ul className="space-y-3">
              {entries.map((entry, i) => (
                <li
                  key={i}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
                >
                  <img
                    src={entry.preview}
                    alt={entry.file.name}
                    className="h-12 w-12 rounded-lg object-cover border border-zinc-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {entry.file.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            entry.status === "error" ? "bg-red-500" : "bg-zinc-900"
                          }`}
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 w-10 text-right">
                        {entry.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 pl-2">
                    {entry.status === "success" && <CheckCircle2 className="h-5 w-5 text-zinc-900" />}
                    {entry.status === "error" && <X className="h-5 w-5 text-red-500" />}
                    {entry.status === "uploading" && <Loader2 className="h-5 w-5 text-zinc-900 animate-spin" />}
                    {entry.status === "idle" && submissionState !== "processing" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeEntry(i); }}
                        className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors rounded-md hover:bg-zinc-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleUpload}
          disabled={submissionState === "processing" || entries.length === 0}
          className="
            mt-8 w-full flex items-center justify-center gap-2
            rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-black
            disabled:opacity-50 disabled:cursor-not-allowed
            text-white font-medium py-3.5 px-4 text-sm
            transition-colors shadow-sm
          "
        >
          {submissionState === "processing" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Submit Notes"
          )}
        </button>

        {/* Error message from backend */}
        {apiError && (
          <div className="mt-6 p-4 rounded-xl border border-red-500/30 bg-red-50/50 text-red-600 text-sm text-center shadow-sm">
            {apiError}
          </div>
        )}
        
        {/* Token badge (debug) */}
        <p className="mt-6 text-center text-xs text-zinc-400 font-mono">
          Token: {token}
        </p>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported page
// ---------------------------------------------------------------------------
export default function UploadPage() {
  return (
    <Suspense>
      <UploadPageInner />
    </Suspense>
  );
}
