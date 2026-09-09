import { definePortalConnector } from "./define";

export const saplicConnector = definePortalConnector({
  slug: "saplic",
  sourceName: "Saplic",
  country: "MZ",
  envPrefix: "SAPLIC",
  pendingReason:
    "Integração pendente. Sem API ou RSS de vagas. O sitemap de empregos exigiria recolher páginas HTML, o que não fazemos.",
  redirectMessage: "A candidatura para esta vaga é concluída no portal Saplic.",
});
