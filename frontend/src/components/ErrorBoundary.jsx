import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            حدث خطأ غير متوقع
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            يرجى تحديث الصفحة والمحاولة مرة أخرى.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="h-11 px-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold hover:bg-slate-800"
          >
            تحديث الصفحة
          </button>
        </div>
      </div>
    );
  }
}
