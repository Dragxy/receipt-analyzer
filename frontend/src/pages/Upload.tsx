import { useState, useRef, useEffect, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../api/client";

type State = "idle" | "loading" | "success" | "error";

const STEPS = [
  { after: 0, label: "Datei wird hochgeladen..." },
  { after: 2, label: "Bild wird geladen..." },
  { after: 5, label: "Beleg wird analysiert..." },
  { after: 10, label: "Artikel werden extrahiert..." },
  { after: 13, label: "Fast fertig..." },
];

function AnalysisProgress({ elapsed }: { elapsed: number }) {
  const step = [...STEPS].reverse().find((s) => elapsed >= s.after) ?? STEPS[0];
  const progress = Math.min(90, (elapsed / 15) * 90);
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{step.label}</span>
        <span className="tabular-nums">{elapsed}s</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        KI analysiert den Beleg. Typisch 10-15 Sekunden.
      </p>
    </div>
  );
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (state === "loading") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  function pickFile(f: File) { setFile(f); setState("idle"); setErrorMsg(""); }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setState("loading");
    setErrorMsg("");
    try {
      const receipt = await api.receipts.upload(file);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setState("success");
      setTimeout(() => navigate(`/receipts/${receipt.id}`), 900);
    } catch (e) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : "Unbekannter Fehler");
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Beleg hochladen</h1>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          state === "loading"
            ? "opacity-50 pointer-events-none border-gray-200 dark:border-gray-700"
            : dragging
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
        <UploadIcon size={36} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">Datei hier ablegen oder klicken</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, WebP, PDF bis 20 MB</p>
      </div>

      {file && state !== "loading" && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <FileText size={20} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-700 dark:text-gray-200 truncate">{file.name}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        </div>
      )}

      {state === "loading" && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <AnalysisProgress elapsed={elapsed} />
        </div>
      )}

      {state === "error" && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {state === "success" && (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm">
          <CheckCircle size={16} />
          <span>Beleg analysiert in {elapsed}s. Weiterleitung...</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || state === "loading" || state === "success"}
        className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === "loading" ? "Analysiere..." : "Hochladen und analysieren"}
      </button>
    </div>
  );
}
