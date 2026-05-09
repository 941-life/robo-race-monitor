"use client";
import { useEffect } from "react";
import { initWS } from "@/lib/ws/client";

export default function WSProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initWS();
  }, []);
  return <>{children}</>;
}
