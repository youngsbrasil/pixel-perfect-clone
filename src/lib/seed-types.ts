export * from "./types";
import type { Alert, ContentItem, LawyerData, SocialProfile } from "./types";
export interface AppStateBase { profiles: SocialProfile[]; lawyers: LawyerData[]; contents: ContentItem[]; alerts: Alert[] }
