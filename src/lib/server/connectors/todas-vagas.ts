import { definePortalConnector } from "./define";

export const TODAS_VAGAS_FEED = "https://todasvagas.com/feed";

export const todasVagasConnector = definePortalConnector({
  slug: "todas-vagas",
  sourceName: "TodasVagas",
  country: "MZ",
  envPrefix: "TODASVAGAS",
  publicFeedUrl: TODAS_VAGAS_FEED,
  pendingReason:
    "Integração pendente. Sem API, RSS ou autorização publicada para importar vagas de todasvagas.com.",
  readyReason: "Feed RSS público autorizado (robots.txt Allow: /feed).",
  redirectMessage: "A candidatura para esta vaga é concluída no portal TodasVagas.",
});
