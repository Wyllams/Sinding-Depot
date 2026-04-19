"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

export function MobileBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 bg-[#121412] border-t border-[#474846]/30 pb-[env(safe-area-inset-bottom,16px)]">
      <div className="flex items-center justify-around h-20 px-4">
        {items.map((item) => {
          // Fix logic: if href is the root sales page, match exactly. Otherwise, match if pathname starts with the subpath.
          const isActive = 
            item.href === "/mobile/sales" || item.href === "/mobile/crew" || item.href === "/mobile/customer"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-300 ${
                isActive ? "text-[#aeee2a]" : "text-[#7B7B78] hover:text-[#faf9f5]"
              }`}
            >
              <div className={`flex flex-col items-center justify-center w-16 pt-1 pb-1.5 rounded-2xl transition-all duration-300 ${isActive ? "bg-[#aeee2a]/10" : ""}`}>
                <span 
                  className="material-symbols-outlined transition-all duration-300 mb-0.5" 
                  translate="no"
                  style={{ 
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    fontSize: isActive ? "24px" : "24px"
                  }}
                >
                  {item.icon}
                </span>
                <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${isActive ? "opacity-100" : "opacity-100 text-[#7B7B78]"}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
