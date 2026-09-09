export const APP_NAME = "Auxilar de Vagas";
export const APP_MARK = "AV";
export const APP_TAGLINE = "Encontre oportunidades de emprego perto de si";
export const OWNER_ADMIN_EMAIL = "chadlopesff@gmail.com";

export function isOwnerAdminEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === OWNER_ADMIN_EMAIL;
}

export function pageTitle(page?: string) {
  return page ? `${page} | ${APP_NAME}` : APP_NAME;
}