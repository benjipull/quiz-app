import { NavLink, useLocation } from "react-router-dom"; 
import { Home, Grid3X3, User, Info, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

const tabs = [
  // 1. Profile
  { icon: User, label: "Profile", path: "/profile" },
  // 2. About Us
  { icon: Info, label: "About Us", path: "/about-us" },
  // 3. Home (This will be the centered tab, index 2)
  { icon: Home, label: "Home", path: "/" },
  // 4. Leaderboard
  { icon: BarChart3, label: "Leaderboard", path: "/leaderboard" },
  // 5. Quizzes (Updated label and path)
  { icon: Grid3X3, label: "Quizzes", path: "/all-quizzes" },
];

export const BottomTabs = () => {
  const location = useLocation();

  // Hide on quiz playing page (/quiz or /quiz/:categoryId)
  const hideOnQuizPage = location.pathname.startsWith("/quiz");
  const hideOnSagaLevelPage = location.pathname.startsWith("/saga-level");

  if (hideOnQuizPage || hideOnSagaLevelPage) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]",
        "z-[120]",
      )}
    >
      <div className="relative mx-auto max-w-md rounded-[28px] border border-[#5f77bd]/55 bg-gradient-to-b from-[#37539a] via-[#223a78] to-[#15295a] shadow-[0_-4px_24px_rgba(9,19,52,0.35),0_18px_45px_rgba(6,15,42,0.7)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="flex h-[82px] items-end justify-between px-2 pb-2 pt-3">
        {tabs.map((tab, index) => {
          const isActive =
            tab.path === "/"
              ? location.pathname === "/" || location.pathname === "/saga-map"
              : location.pathname === tab.path;
          const isCenter = index === 2;
          const isHome = isCenter;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-1 flex-col items-center justify-end gap-1.5 transition-transform duration-300",
                isCenter ? "translate-y-0" : ""
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-300",
                  isHome
                    ? isActive
                      ? "h-[72px] w-[72px] border-2 border-[#decfff] bg-gradient-to-b from-[#ad7dff] to-[#613ecf] text-white shadow-[0_0_0_6px_rgba(86,123,219,0.35),0_16px_34px_rgba(69,42,160,0.72)]"
                      : "h-[72px] w-[72px] border-2 border-[#b9adef]/70 bg-gradient-to-b from-[#7661d4] to-[#4b3b9b] text-white shadow-[0_0_0_6px_rgba(86,123,219,0.25),0_12px_28px_rgba(52,34,121,0.62)]"
                    : isActive
                    ? "h-12 w-12 border border-[#93b6ff]/80 bg-gradient-to-b from-[#4b66b4] to-[#304a90] text-white shadow-[0_8px_20px_rgba(44,86,178,0.48)]"
                    : "h-12 w-12 border border-[#7b9ade]/35 bg-gradient-to-b from-[#273f7d]/95 to-[#1b2f66]/95 text-[#bdd0ff] shadow-[0_7px_18px_rgba(7,15,41,0.45)]"
                )}
              >
                <tab.icon className={cn("transition-all duration-300", isCenter ? "h-7 w-7" : "h-5 w-5")} />
              </div>
              <span
                className={cn(
                  "text-[11px] leading-none transition-colors duration-300",
                  isHome ? "font-semibold tracking-[0.01em]" : "font-medium",
                  isActive ? "text-white" : "text-[#b4c7f3]",
                  isHome && isActive ? "text-[#f2eaff] font-bold" : ""
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
        </div>
      </div>
    </div>,
    document.body,
  );
};

