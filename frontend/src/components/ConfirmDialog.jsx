export default function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 fade-in"
         onClick={onCancel}>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full mx-4 shadow-xl"
           onClick={(e) => e.stopPropagation()}>
        <p className="text-slate-900 dark:text-slate-100 font-semibold text-base mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="h-10 px-5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="h-10 px-5 bg-red-600 text-white font-semibold hover:bg-red-700"
          >
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
}
