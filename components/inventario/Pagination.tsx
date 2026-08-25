"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
  limit: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  total,
  limit,
}: PaginationProps) {
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white border-t border-gray-200">
      <div className="text-sm text-gray-600">
        Mostrando <span className="font-semibold">{startItem}</span> a{" "}
        <span className="font-semibold">{endItem}</span> de{" "}
        <span className="font-semibold">{total}</span> productos
      </div>

      <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>

        {getPageNumbers().map((page, idx) =>
          typeof page === "number" ? (
        <button
          key={idx}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
            currentPage === page
              ? "bg-blue-600 text-white"
              : "text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          {page}
        </button>
          ) : (
            <span key={idx} className="px-2 text-gray-400">
              {page}
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}