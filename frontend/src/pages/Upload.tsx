import { useState, useRef, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../api/client";

type State = "idle" | "loading" | "success" | "error";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  function pickFile(f: File) {
    setFile(f);
    setState("idle");
    setErrorMsg("");
  }

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
      setTimeout(() => navigate(`/receipts/${receipt.id}`), 800);
    } catch (e) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : "Unbekannter Fehler");
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Beleg hochladen</h1>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />
        <UploadIcon size={36} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium">Datei hier ablegen oder klicken</p>
        <p className="text-sm text-gray-400 mt-1">JPG, PNG, WebP, PDF bis 20 MB</p>
      </div>

      {file && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <FileText size={20} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-700 truncate">{file.name}</p>
            <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {state === "success" && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
          <CheckCircle size={16} />
          <span>Beleg analysiert. Weiterleitung...</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || state === "loading" || state === "success"}
        className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === "loading" ? "Analysiere Beleg..." : "Hochladen und analysieren"}
      </button>

      {state === "loading" && (
        <p className="text-center text-sm text-gray-500">
          Ollama analysiert den Beleg. Das kann bis zu 2 Minuten dauern.
        </p>
      )}
    </div>
  );
}
