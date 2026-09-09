import { definePortalConnector } from "./define";

export const NET_EMPREGOS_FEED = "https://www.net-empregos.com/rss.asp";

export const netEmpregosConnector = definePortalConnector({
  slug: "net-empregos",
  sourceName: "Net-Empregos",
  country: "PT",
  envPrefix: "NET_EMPREGOS",
  publicFeedUrl: NET_EMPREGOS_FEED,
  pendingReason:
    "Integração pendente. Sem API, RSS ou parceria oficial para importar vagas de net-empregos.com.",
  readyReason: "Feed RSS público declarado no robots.txt (rss.asp).",
  redirectMessage: "A candidatura para esta vaga é concluída no portal Net-Empregos.",
});
