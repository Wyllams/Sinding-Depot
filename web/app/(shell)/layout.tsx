import { Sidebar } from "../../components/Sidebar";
import { SidebarProvider } from "../../components/SidebarContext";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="h-screen overflow-hidden flex">
        <Sidebar />
        <div className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
