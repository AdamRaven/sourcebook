/// <reference types="cypress" />

// Diese Datei ruft das echte Modell auf. Sie ist deshalb die langsamste im
// Satz — und die einzige, die beweist, dass der Kern wirklich funktioniert.

const QUELLE = [
  "Protokoll der Bueroversammlung vom 14. Maerz 2024.",
  "",
  "Die Kaffeemaschine wurde vom Hersteller Brewtec beschafft.",
  "Der Kaufpreis betrug 749 Euro netto.",
  "Die Garantiezeit betraegt drei Jahre und endet im Maerz 2027.",
  "Zustaendig fuer die Wartung ist Frau Berger aus der Verwaltung.",
  "",
  "Ausserdem wurde beschlossen, die Fahrradstellplaetze zu verdoppeln.",
].join("\n");

describe("Antworten mit Belegen", () => {
  beforeEach(() => {
    cy.registerFreshUser();
    cy.createNotebook();
    cy.addTextSource("Protokoll Bueroversammlung", QUELLE);
  });

  it("beantwortet eine Frage aus der Quelle und belegt sie", () => {
    cy.get('input[placeholder="Frage an deine Quellen…"]')
      .type("Was hat die Kaffeemaschine gekostet?{enter}");

    // Antwort kommt streamend, deshalb grosszuegig warten.
    cy.get('[data-testid="assistant-message"]', { timeout: 90_000 })
      .should("contain.text", "749");

    // Die Behauptung muss belegt sein, nicht nur richtig.
    cy.get('[data-testid="citation-chip"]').should("have.length.at.least", 1);
  });

  it("oeffnet beim Klick auf den Beleg die Originalstelle", () => {
    cy.get('input[placeholder="Frage an deine Quellen…"]')
      .type("Wer ist fuer die Wartung zustaendig?{enter}");

    cy.get('[data-testid="citation-chip"]', { timeout: 90_000 }).first().click();

    cy.get('[data-testid="citation-viewer"]').should("be.visible");
    cy.get('[data-testid="citation-viewer"]').should("contain.text", "Protokoll Bueroversammlung");

    // Der markierte Bereich muss echter Text aus der Quelle sein.
    cy.get('[data-testid="cited-text"]')
      .invoke("text")
      .should((markiert) => {
        expect(markiert.trim().length).to.be.greaterThan(0);
        expect(QUELLE).to.contain(markiert.trim().slice(0, 30));
      });
  });

  it("erfindet nichts, wenn die Quelle die Antwort nicht hergibt", () => {
    cy.get('input[placeholder="Frage an deine Quellen…"]')
      .type("Wie hoch war der Umsatz des Unternehmens im Jahr 2019?{enter}");

    cy.get('[data-testid="assistant-message"]', { timeout: 90_000 })
      .invoke("text")
      .should((antwort) => {
        const text = antwort.toLowerCase();
        const raeumtEsEin =
          text.includes("nicht") || text.includes("keine") || text.includes("enthalten");
        expect(raeumtEsEin, `Antwort war: ${antwort}`).to.equal(true);
      });
  });

  it("behaelt den Verlauf nach dem Neuladen", () => {
    cy.get('input[placeholder="Frage an deine Quellen…"]')
      .type("Von welchem Hersteller stammt die Maschine?{enter}");

    cy.get('[data-testid="assistant-message"]', { timeout: 90_000 })
      .should("contain.text", "Brewtec");

    cy.reload();

    cy.get('[data-testid="user-message"]').should("contain.text", "Hersteller");
    cy.get('[data-testid="assistant-message"]').should("contain.text", "Brewtec");
    // Auch die Belege muessen wieder da sein.
    cy.get('[data-testid="citation-chip"]').should("have.length.at.least", 1);
  });
});
