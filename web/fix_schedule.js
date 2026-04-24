const fs = require('fs');
const path = 'c:\\\\Users\\\\wylla\\\\.gemini\\\\Siding Depot\\\\web\\\\app\\\\(shell)\\\\schedule\\\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/useState<"active" \| "draft" \| "on_hold">/g, 'useState<"pending" | "tentative" | "scheduled" | "in_progress" | "done">');
content = content.replace(/useState<"active" \| "draft" \| "on_hold">\("active"\)/g, 'useState<"pending" | "tentative" | "scheduled" | "in_progress" | "done">("scheduled")');
content = content.replace(/setEditStatus\(confirmedStatus as "active" \| "draft" \| "on_hold"\)/g, 'setEditStatus(confirmedStatus as "pending" | "tentative" | "scheduled" | "in_progress" | "done")');
content = content.replace(/onChange=\{\(val\) => setEditStatus\(val as "active" \| "draft" \| "on_hold"\)\}/g, 'onChange={(val) => setEditStatus(val as "pending" | "tentative" | "scheduled" | "in_progress" | "done")}');

const oldDropdown = `{ value: "active", label: "Confirmed" },
                          { value: "draft", label: "Tentative" },
                          { value: "on_hold", label: "Pending" }`;
const newDropdown = `{ value: "pending", label: "Pending" },
                          { value: "tentative", label: "Tentative" },
                          { value: "scheduled", label: "Confirmed" },
                          { value: "in_progress", label: "In Progress" },
                          { value: "done", label: "Done" }`;
content = content.replace(oldDropdown, newDropdown);
content = content.replace(oldDropdown.replace(/\n/g, '\r\n'), newDropdown.replace(/\n/g, '\r\n'));

const oldLabel = `editJob.jobStartStatus === "active" ? "CONFIRMED" : editJob.jobStartStatus === "draft" ? "TENTATIVE" : "PENDING"`;
const newLabel = `editJob.jobStartStatus === "scheduled" ? "CONFIRMED" : editJob.jobStartStatus === "tentative" ? "TENTATIVE" : editJob.jobStartStatus === "in_progress" ? "IN PROGRESS" : editJob.jobStartStatus === "done" ? "DONE" : "PENDING"`;
content = content.replace(oldLabel, newLabel);

const oldBg = `editJob.jobStartStatus === "active" ? "rgba(34, 197, 94, 0.1)" : editJob.jobStartStatus === "draft" ? "rgba(245, 166, 35, 0.1)" : "rgba(239, 68, 68, 0.1)"`;
const newBg = `editJob.jobStartStatus === "done" ? "rgba(34, 197, 94, 0.1)" : editJob.jobStartStatus === "in_progress" ? "rgba(174, 238, 42, 0.1)" : editJob.jobStartStatus === "scheduled" ? "rgba(96, 184, 245, 0.1)" : editJob.jobStartStatus === "tentative" ? "rgba(245, 166, 35, 0.1)" : "rgba(239, 68, 68, 0.1)"`;
content = content.replace(oldBg, newBg);

const oldColor = `editJob.jobStartStatus === "active" ? "#22c55e" : editJob.jobStartStatus === "draft" ? "#f5a623" : "#ef4444"`;
const newColor = `editJob.jobStartStatus === "done" ? "#22c55e" : editJob.jobStartStatus === "in_progress" ? "#aeee2a" : editJob.jobStartStatus === "scheduled" ? "#60b8f5" : editJob.jobStartStatus === "tentative" ? "#f5a623" : "#ef4444"`;
content = content.replace(oldColor, newColor);

const oldBorder = `editJob.jobStartStatus === "active" ? "rgba(34, 197, 94, 0.2)" : editJob.jobStartStatus === "draft" ? "rgba(245, 166, 35, 0.2)" : "rgba(239, 68, 68, 0.2)"`;
const newBorder = `editJob.jobStartStatus === "done" ? "rgba(34, 197, 94, 0.2)" : editJob.jobStartStatus === "in_progress" ? "rgba(174, 238, 42, 0.2)" : editJob.jobStartStatus === "scheduled" ? "rgba(96, 184, 245, 0.2)" : editJob.jobStartStatus === "tentative" ? "rgba(245, 166, 35, 0.2)" : "rgba(239, 68, 68, 0.2)"`;
content = content.replace(oldBorder, newBorder);

content = content.replace(/baseStatus === "draft"/g, 'baseStatus === "tentative"');
content = content.replace(/job\.jobStartStatus === "on_hold"/g, 'job.jobStartStatus === "pending"');
content = content.replace(/job\.jobStartStatus === "draft"/g, 'job.jobStartStatus === "tentative"');
content = content.replace(/const baseStatus = job\.jobStartStatus \?\? "active";/g, 'const baseStatus = job.jobStartStatus ?? "scheduled";');
content = content.replace(/const confirmedStatus = \(baseStatus === "tentative" && job\.startDate <= todayStr\) \? "active" : baseStatus;/g, 'const confirmedStatus = (baseStatus === "tentative" && job.startDate <= todayStr) ? "scheduled" : baseStatus;');

// fix getVisualStatus mapping too:
content = content.replace(/if \(job\.jobStartStatus === "pending"\) return "pending";\n\n  \/\/ Tentative: job not yet confirmed \(draft status\) — always orange regardless of date\n  if \(job\.jobStartStatus === "tentative"\) return "tentative";/g, 'if (job.jobStartStatus === "pending") return "pending";\n  if (job.jobStartStatus === "tentative") return "tentative";\n  if (job.jobStartStatus === "in_progress") return "in_progress";\n  if (job.jobStartStatus === "scheduled") return "scheduled";');
content = content.replace(/if \(job\.jobStartStatus === "pending"\) return "pending";\r\n\r\n  \/\/ Tentative: job not yet confirmed \(draft status\) — always orange regardless of date\r\n  if \(job\.jobStartStatus === "tentative"\) return "tentative";/g, 'if (job.jobStartStatus === "pending") return "pending";\r\n  if (job.jobStartStatus === "tentative") return "tentative";\r\n  if (job.jobStartStatus === "in_progress") return "in_progress";\r\n  if (job.jobStartStatus === "scheduled") return "scheduled";');

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced successfully');
