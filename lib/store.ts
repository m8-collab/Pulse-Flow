import { create } from "zustand";

type ViewMode = "kanban" | "list";

interface UIState {
  taskViewMode: ViewMode;
  setTaskViewMode: (mode: ViewMode) => void;

  campaignFilters: {
    status: string | null;
    search: string;
  };
  setCampaignFilters: (filters: Partial<UIState["campaignFilters"]>) => void;

  onlineUserIds: string[];
  setOnlineUserIds: (ids: string[]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  taskViewMode: "kanban",
  setTaskViewMode: (mode) => set({ taskViewMode: mode }),

  campaignFilters: { status: null, search: "" },
  setCampaignFilters: (filters) =>
    set((state) => ({ campaignFilters: { ...state.campaignFilters, ...filters } })),

  onlineUserIds: [],
  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),
}));
