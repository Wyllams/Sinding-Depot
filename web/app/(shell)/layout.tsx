import { Sidebar } from "../../components/Sidebar";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden flex">
      <Sidebar />
      <div className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
        {children}
      </div>
    </div>
  );
}
