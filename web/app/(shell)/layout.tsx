import { Sidebar } from "../../components/Sidebar";
import { SidebarProvider } from "../../components/SidebarContext";
import { UndoProvider } from "../../components/UndoContext";
import { ProfileProvider } from "../../components/ProfileContext";
import { PushNotificationInit } from "../../components/pwa/PushNotificationInit";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider>
      <SidebarProvider>
        <UndoProvider>
          <div className="h-screen overflow-hidden flex">
            <Sidebar />
            <div className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
              {children}
            </div>
          </div>
          <PushNotificationInit />
        </UndoProvider>
      </SidebarProvider>
    </ProfileProvider>
  );
}
