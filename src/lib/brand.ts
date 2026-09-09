export const APP_NAME = "Auxilar de Vagas";
export const APP_MARK = "AV";
export const APP_TAGLINE = "Encontre oportunidades de emprego perto de si";

export function pageTitle(page?: string) {
  return page ? `${page} | ${APP_NAME}` : APP_NAME;
}
