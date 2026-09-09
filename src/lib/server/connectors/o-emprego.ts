import { definePortalConnector } from "./define";

export const oEmpregoConnector = definePortalConnector({
  slug: "oemprego-mz",
  sourceName: "O Emprego",
  country: "MZ",
  envPrefix: "OEMPREGO_MZ",
  pendingReason:
    "Integração pendente. O feed público de oemprego.co.mz é de artigos, não de vagas. Sem API ou parceria para importar ofertas.",
  redirectMessage: "A candidatura para esta vaga é concluída no portal O Emprego.",
});
