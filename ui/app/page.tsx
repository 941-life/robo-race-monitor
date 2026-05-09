"use client";
import TopBar from "@/components/layout/TopBar";
import DesktopLayout from "@/components/layout/DesktopLayout";
import MobileLayout from "@/components/layout/MobileLayout";
import WSProvider from "@/components/WSProvider";

export default function DashboardPage() {
  return (
    <WSProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-[#1a2129]">
        <TopBar />
        {/* pt-14 clears the fixed TopBar (h-14) */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="hidden lg:block h-full">
            <DesktopLayout />
          </div>
          <div className="lg:hidden h-full">
            <MobileLayout />
          </div>
        </main>
      </div>
    </WSProvider>
  );
}
