import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

export function RadarPanel({
  title,
  emptyLabel,
  data,
  color,
  footer,
}: {
  title: string;
  emptyLabel: string;
  data: Array<{ label: string; hours: number }>;
  color: string;
  footer?: React.ReactNode;
}) {
  const hasData = data.length > 0;
  const [showModal, setShowModal] = useState(false);

  const breakdown = useMemo(
    () => (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {data.map((row, idx) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-semibold"
                style={{ color }}
              >
                {idx + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{row.label}</p>
                <p className="text-xs text-gray-500">{row.hours.toFixed(2)} hours</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    [data, color]
  );

  return (
    <div className="card-clean bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          {hasData && <span className="text-xs text-gray-500">{data.length} entries</span>}
          {hasData && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
            >
              Expand
            </button>
          )}
        </div>
      </div>
      <div className="h-[280px]">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">{emptyLabel}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="label" />
              <PolarRadiusAxis angle={45} />
              <Radar name="Hours" dataKey="hours" stroke={color} fill={color} fillOpacity={0.4} />
              <Legend verticalAlign="top" align="left" layout="vertical" />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
      {footer && <div className="mt-2">{footer}</div>}
      {showModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 overflow-auto py-10"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-w-[1200px] max-h-[90vh] overflow-auto p-6 border border-gray-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
                  {hasData && <p className="text-xs text-gray-500">{data.length} entries</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-800 text-sm"
                >
                  Close
                </button>
              </div>
              <div className="h-[360px] mb-4">
                {!hasData ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">{emptyLabel}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="label" />
                      <PolarRadiusAxis angle={45} />
                      <Radar name="Hours" dataKey="hours" stroke={color} fill={color} fillOpacity={0.4} />
                      <Legend verticalAlign="top" align="left" layout="vertical" />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
              {hasData ? breakdown : <p className="text-sm text-gray-500">{emptyLabel}</p>}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
