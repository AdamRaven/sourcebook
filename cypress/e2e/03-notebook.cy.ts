/// <reference types="cypress" />

describe("Notebooks und Quellen", () => {
  beforeEach(() => {
    cy.registerFreshUser();
  });

  it("beginnt leer und erklaert das", () => {
    cy.contains("Lege dein erstes Notebook an").should("be.visible");
  });

  it("legt ein Notebook an und oeffnet es", () => {
    cy.createNotebook();
    cy.contains("Quellen").should("be.visible");
    cy.contains("Noch keine").should("be.visible");
  });

  it("sperrt den Chat, solange keine Quelle da ist", () => {
    cy.createNotebook();
    cy.get('input[placeholder="Erst eine Quelle hochladen"]').should("be.disabled");
    cy.contains("Lade links eine Quelle hoch").should("be.visible");
  });

  it("nimmt eingefuegten Text auf und macht ihn durchsuchbar", () => {
    cy.createNotebook();
    cy.addTextSource(
      "Notiz zur Kaffeemaschine",
      "Die Kaffeemaschine im Buero wurde am 14. Maerz 2024 gekauft. " +
        "Sie hat 749 Euro gekostet und stammt vom Hersteller Brewtec. " +
        "Die Garantie laeuft ueber drei Jahre.",
    );
    cy.contains("1 im Notebook").should("be.visible");
    // Erst mit Quelle wird das Eingabefeld freigegeben.
    cy.get('input[placeholder="Frage an deine Quellen…"]').should("not.be.disabled");
  });

  it("entfernt eine Quelle wieder", () => {
    cy.createNotebook();
    cy.addTextSource("Wegwerfnotiz", "Dieser Text wird gleich wieder geloescht.");
    cy.get('[data-testid="source-item"]').realHoverFallback();
    cy.get('button[aria-label="Quelle entfernen"]').click({ force: true });
    cy.get('[data-testid="source-item"]').should("not.exist");
  });

  it("merkt sich einen umbenannten Titel", () => {
    cy.createNotebook();
    cy.get('header input').clear().type("Recherche Kaffeemaschine").blur();
    cy.reload();
    cy.get('header input').should("have.value", "Recherche Kaffeemaschine");
  });
});
