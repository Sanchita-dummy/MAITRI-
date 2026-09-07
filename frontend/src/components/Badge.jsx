const COLORS = {
  ELIGIBLE: "bg-green-100 text-green-700",
  BORDERLINE: "bg-amber-100 text-amber-700",
  NOT_ELIGIBLE: "bg-red-100 text-red-700",
  APPROVE: "bg-green-100 text-green-700",
  REVIEW: "bg-amber-100 text-amber-700",
  REJECT: "bg-red-100 text-red-700",
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-slate-100 text-slate-600",
  PLANNED: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  SCALED: "bg-purple-100 text-purple-700",
  SCALE: "bg-green-100 text-green-700",
  ITERATE: "bg-amber-100 text-amber-700",
  STOP: "bg-red-100 text-red-700",
  MET: "bg-green-100 text-green-700",
  ON_TRACK: "bg-blue-100 text-blue-700",
  AT_RISK: "bg-red-100 text-red-700",
  SUBMITTED: "bg-slate-100 text-slate-600",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function Badge({ status, children }) {
  const cls = COLORS[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`badge gap-1.5 ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children || status?.replace(/_/g, " ")}
    </span>
  );
}
