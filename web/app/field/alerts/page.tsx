import React from "react";

export default function FieldAlerts() {
  const alerts = [
    {
      id: 1,
      icon: "warning",
      iconBg: "bg-[#ff7351]/10",
      iconColor: "text-[#ff7351]",
      title: "Weather Advisory",
      message: "High winds expected tomorrow afternoon. Please secure all Siding materials on scaffolds.",
      time: "2 hours ago",
    },
    {
      id: 2,
      icon: "verified",
      iconBg: "bg-[var(--color-siding-green)]/10",
      iconColor: "text-[var(--color-siding-green)]",
      title: "Document Signed",
      message: "The customer at 400 Broad Street has successfully signed the Certificate of Completion.",
      time: "Yesterday",
    },
    {
      id: 3,
      icon: "inventory_2",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      title: "Change Order Updated",
      message: "Home Office approved your change order for 123 Elm St. You may proceed with the extra work.",
      time: "2 days ago",
    },
  ];

  return (
    <div className="p-4 space-y-3 bg-[#050505] min-h-full">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-[#151515] border border-zinc-800/50 p-4 rounded-3xl flex gap-4"
        >
          <div className={`${alert.iconBg} w-12 h-12 rounded-full shrink-0 flex items-center justify-center`}>
            <span className={`material-symbols-outlined ${alert.iconColor}`} translate="no">{alert.icon}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-bold text-sm">{alert.title}</h3>
            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{alert.message}</p>
            <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest mt-2 block">{alert.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
