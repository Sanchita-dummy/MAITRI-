export default function StatCard({ label, value, icon: Icon, accent = "maitri" }) {
  const accentClasses = {
    maitri: "bg-maitri-50 text-maitri-700",
    green: "bg-green-50 text-green-700",
    saffron: "bg-orange-50 text-orange-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="card flex min-h-[150px] flex-col justify-between p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClasses[accent]}`}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div className="mt-5">
        <div className="text-3xl font-black tracking-[-0.05em] text-[#0b2d4a]">{value}</div>
        <div className="mt-1 text-xs font-medium leading-4 text-slate-500">{label}</div>
      </div>
    </div>
  );
}
