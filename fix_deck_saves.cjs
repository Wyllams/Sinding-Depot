const fs = require('fs');
const path = 'c:/Users/wylla/.gemini/Siding Depot/web/app/(shell)/projects/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetEditDeck = `                                const { error } = await supabase.from("service_assignments")
                                  .update({ scheduled_end_at: endAt.toISOString() })
                                  .eq("id", assignment.id);
                                if (error) console.error("[EditDeckScope] update error:", error);
                                else console.log("[EditDeckScope] Updated decks:", startIso, "->", endAt.toISOString().split("T")[0], \`(\${newDays} days)\`);
                              }`;

const replacementEditDeck = `                                const { error } = await supabase.from("service_assignments")
                                  .update({ scheduled_end_at: endAt.toISOString() })
                                  .eq("id", assignment.id);
                                if (error) console.error("[EditDeckScope] update error:", error);
                                else console.log("[EditDeckScope] Updated decks:", startIso, "->", endAt.toISOString().split("T")[0], \`(\${newDays} days)\`);
                              }
                              if (decksSvc) {
                                await supabase.from("job_services").update({ contracted_amount: parseFloat(deckPrice) || null, scope_of_work: deckScope }).eq("id", decksSvc.id);
                              }`;

content = content.replace(targetEditDeck, replacementEditDeck);

const targetAddDeck = `                              // Persist all selected sub-service assignments to DB
                              const partnerName = assignedPartners[openPartnerModal.id] || "";
                              for (const subId of selectedSubSvcs) {`;

const replacementAddDeck = `                              // Fetch just added decks svc to persist price/scope
                              const { data: refreshedJob } = await supabase.from("jobs").select("services:job_services ( id, service_type:service_types ( name ) )").eq("id", job.id).single();
                              const newDecksSvc = refreshedJob?.services?.find((s: any) => s.service_type?.name?.toLowerCase() === "decks");
                              if (newDecksSvc) {
                                await supabase.from("job_services").update({ contracted_amount: parseFloat(deckPrice) || null, scope_of_work: deckScope }).eq("id", newDecksSvc.id);
                              }
                              // Persist all selected sub-service assignments to DB
                              const partnerName = assignedPartners[openPartnerModal.id] || "";
                              for (const subId of selectedSubSvcs) {`;

content = content.replace(targetAddDeck, replacementAddDeck);

fs.writeFileSync(path, content);
console.log('Fixed deck saves');
