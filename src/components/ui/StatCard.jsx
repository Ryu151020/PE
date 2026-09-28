import React from "react";

export function StatCard({
  icon: Icon,
  iconBg = "bg-[#F4F7FE]",
  iconColor = "text-[#4318FF]",
  label,
  value,
  badgeText,
  badgeType = "success", // success | warning | info | neutral
}) {
  const badgeStyles = {
    success: "bg-[#E6FAF5] text-[#05CD99]",
    warning: "bg-[#FFF8E7] text-[#FFB547]",
    danger: "bg-[#FFF5F5] text-[#EE5D50]",
    info: "bg-[#F4F7FE] text-[#4318FF]",
    neutral: "bg-canvas text-body",
  };

  return (
    <div className="flex items-center gap-3.5 sm:gap-4 bg-white rounded-[20px] p-3.5 sm:p-4 border border-line/70 shadow-xs hover:shadow-soft hover:-translate-y-0.5 transition-all group">
      {Icon && (
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor} transition-transform group-hover:scale-105`}
        >
          <Icon size={22} strokeWidth={2.2} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] sm:text-xs font-bold text-[#A3AED0] uppercase tracking-wider truncate">
          {label}
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl sm:text-2xl font-bold text-[#1B2559] tracking-tight">
            {value}
          </span>
          {badgeText && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full leading-none shrink-0 ${
                badgeStyles[badgeType] || badgeStyles.neutral
              }`}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
