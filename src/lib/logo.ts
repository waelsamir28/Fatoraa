import { DEFAULT_LOGO } from "./constants";

/** الشعار المستخدم في البرنامج: المرفوع من الإعدادات وإلا الشعار الافتراضي */
export const resolveLogo = (custom?: string | null) => (custom && custom.trim() ? custom.trim() : DEFAULT_LOGO);
