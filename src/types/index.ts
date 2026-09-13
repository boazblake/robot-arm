export type DisplayType = "phone" | "tablet" | "desktop";
export interface Settings { width: number; displayType: DisplayType; }
export interface Model { settings: Settings; }
