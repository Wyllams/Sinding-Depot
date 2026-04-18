# 🚧 Roadmap e Dívidas Técnicas

Onde estamos e para onde o barco vai. Essa documentação ajuda os desenvolvedores futuros a priorizarem o pipeline da codebase sem esbarrar no que deliberadamente escolhemos ignorar pra focar em *Shippar Rápido*.

## O Termômetro de Conclusão Atual 
*(Atualizado Abril/2026)*

- [x] Refatorar Cash Payments pra comportar modais brandizados (Exclusão Segura).
- [x] Modificação agressiva nas cores do calendário (Measurement = Orange) integrando Schedules em sincronia.
- [x] Ocultar contas inativas (Armando) do "Set Goals Leaderboard".
- [x] Automação completa do Onboarding do Cliente por Webhook ClickOne.
- [ ] Refinar "Portal do Cliente" Mobile-View (Corte atual na UI em celulares das antigas séries do iphone).
- [ ] Construir envio de OTP duplo em Phone Number pras Crews logadas via PWA offline.

## Débitos Técnicos Acumulados (Nossas "Gambiarras")

1. **A Questão dos IDs vs Nomes Fuzzy nas Crews:**
   - Para aceitarmos Crews como "Xicara" e "Xicara 01" das planilhas das antigas, o back-end executa fuzzy string match para associar os times invés do estrito UUID_V4 do banco em certas funções legadas de agendamentos massivos. Funciona, porém custa Mils de O(1) de processamento. A meta é eliminar names e migrar fully pra dropdown UIDs fechados no Input das Crews.
2. **Supabase Bucket Cache:** 
   - Ao sobrepor fotos duplicatas (o usuário upa foto 2 com mesmo nome e data da foto 1 na Service Call), a UI não atualiza a miniatura devido ao cache Vercel+Supabase URL. Precisa ser enfiado um hash md5 random ao final da url para explodir o TTL do proxy na proxima release.

---
**Relações (Map):**
- As resoluções de UI desses Roadmap Tasks são sempre avaliadas via: [[Design System e Padrões]]
