"use client";

interface RefreshStatusBarProps {
  lastUpdate: Date | null;
  secondsUntilNext: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function RefreshStatusBar({
  lastUpdate,
  secondsUntilNext,
  isRefreshing,
  onRefresh,
}: RefreshStatusBarProps) {
  const minutes = Math.floor(secondsUntilNext / 60);
  const seconds = secondsUntilNext % 60;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
      {/* Información de última actualización */}
      <div className="flex flex-col xs:flex-row xs:items-center gap-2 sm:gap-4 text-sm w-full sm:w-auto">
        <div className="flex items-center gap-2 text-gray-600">
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs sm:text-sm">
            Última actualización:{" "}
            <strong className="text-gray-900">
              {lastUpdate ? formatTime(lastUpdate) : "—"}
            </strong>
          </span>
        </div>


      </div>

      {/* Botón de actualización manual */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition disabled:opacity-50 w-full sm:w-auto"
      >
        <svg
          className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {isRefreshing ? "Actualizando..." : "Actualizar ahora"}
      </button>
    </div>
  );
}