import { useEffect, useRef, useState } from "react";
import { api, formatApiError, API } from "../lib/api";
import { toast } from "sonner";
import { useI18n } from "../lib/i18n";
import { ArrowLeft, ArrowRight, CheckCircle, Camera, X } from "@phosphor-icons/react";

function CurrentInput({ label, name, value, onChange, ar }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type="number"
          step="0.1"
          min="0"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.0"
          className="w-full h-12 px-3 pe-12 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005CBE] text-slate-900 font-mono text-lg"
        />
        <span className="absolute end-3 text-xs font-bold text-slate-400 pointer-events-none">
          A
        </span>
      </div>
    </div>
  );
}

export default function MDBReadingForm({ onBack, onSubmitted }) {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const fileRef = useRef(null);

  const [panelNumber, setPanelNumber] = useState("");
  const [l1, setL1] = useState("");
  const [l2, setL2] = useState("");
  const [l3, setL3] = useState("");
  const [neutral, setNeutral] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [panels, setPanels] = useState([]);

  useEffect(() => {
    api.get("/mdb-readings").then(({ data }) => {
      const unique = [...new Set(data.map((d) => d.panel_number))].sort();
      setPanels(unique);
    }).catch(() => {});
  }, []);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(ar ? "يرجى اختيار صورة" : "Please select an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(ar ? "الصورة أكبر من 5MB" : "Image too large (max 5MB)");
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!panelNumber.trim()) {
      toast.error(ar ? "أدخل رقم اللوحة" : "Enter panel number");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("panel_number", panelNumber.trim().toUpperCase());
      fd.append("l1", l1);
      fd.append("l2", l2);
      fd.append("l3", l3);
      fd.append("neutral", neutral);
      fd.append("notes", notes);
      if (image) fd.append("image", image);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/mdb-readings`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Submit failed");
      }
      toast.success(ar ? "تم حفظ القراءة بنجاح" : "Reading saved successfully");
      setDone(true);
    } catch (err) {
      toast.error(err.message || formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4">
        <CheckCircle size={64} weight="fill" className="text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {ar ? "تم حفظ القراءة" : "Reading Saved"}
        </h2>
        <p className="text-sm text-slate-500 mb-8">
          {ar ? "تم تسجيل قراءة MDB بنجاح في النظام." : "MDB reading has been recorded successfully."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setDone(false); setPanelNumber(""); setL1(""); setL2(""); setL3(""); setNeutral(""); setNotes(""); removeImage(); }}
            className="h-11 px-6 bg-[#005CBE] text-white font-semibold hover:bg-[#004a9e]"
          >
            {ar ? "قراءة جديدة" : "New Reading"}
          </button>
          <button onClick={onBack}
                  className="h-11 px-6 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50">
            {t("back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack}
                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <Arrow size={18} weight="bold" />
          {t("back")}
        </button>
        <span className="text-slate-300">|</span>
        <span className="text-sm font-semibold text-slate-900">
          {ar ? "قراءة MDB اليومية" : "MDB Daily Reading"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Panel number */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
            {ar ? "رقم اللوحة" : "Panel Number"}
          </label>
          <input
            type="text"
            list="panel-suggestions"
            value={panelNumber}
            onChange={(e) => setPanelNumber(e.target.value)}
            placeholder={ar ? "مثال: MDB1" : "e.g. MDB1"}
            required
            className="w-full h-12 px-3 border border-slate-200 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
          />
          <datalist id="panel-suggestions">
            {panels.map((p) => <option key={p} value={p} />)}
          </datalist>
        </div>

        {/* Current readings */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
            {ar ? "قراءات التيار (A)" : "Current Readings (A)"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CurrentInput label="L1 Current" value={l1} onChange={setL1} ar={ar} />
            <CurrentInput label="L2 Current" value={l2} onChange={setL2} ar={ar} />
            <CurrentInput label="L3 Current" value={l3} onChange={setL3} ar={ar} />
            <CurrentInput label={ar ? "Neutral (N)" : "Neutral (N)"} value={neutral} onChange={setNeutral} ar={ar} />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
            {ar ? "ملاحظات (اختياري)" : "Notes (optional)"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={ar ? "أي ملاحظات إضافية..." : "Any additional notes..."}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
          />
        </div>

        {/* Image upload */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
            {ar ? "صورة العداد (اختياري)" : "Meter Image (optional)"}
          </div>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="preview"
                className="h-40 w-auto max-w-full object-contain border border-slate-200 rounded"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1 end-1 h-7 w-7 bg-red-600 text-white flex items-center justify-center rounded-full hover:bg-red-700"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-[#005CBE] hover:text-[#005CBE] transition-colors"
            >
              <Camera size={28} weight="light" />
              <span className="text-sm font-semibold">
                {ar ? "اضغط لرفع صورة" : "Tap to upload image"}
              </span>
              <span className="text-xs text-slate-400">{ar ? "JPG, PNG — حتى 5MB" : "JPG, PNG — up to 5MB"}</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImage}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 bg-[#005CBE] text-white font-bold text-sm hover:bg-[#004a9e] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving
            ? (ar ? "جارٍ الحفظ..." : "Saving...")
            : (ar ? "حفظ القراءة" : "Save Reading")}
        </button>
      </form>
    </div>
  );
}
