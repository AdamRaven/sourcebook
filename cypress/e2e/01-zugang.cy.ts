/// <reference types="cypress" />

describe("Zugang und Schutz", () => {
  it("leitet nicht angemeldete Besucher auf die Anmeldung", () => {
    cy.visit("/");
    cy.location("pathname").should("eq", "/login");
  });

  it("zeigt eine Anmeldemaske, die ohne Vorwissen bedienbar ist", () => {
    cy.visit("/login");

    // Beide Wege sind sichtbare Schaltflaechen, kein versteckter Link.
    cy.contains("button", "Ich habe ein Konto").should("be.visible");
    cy.contains("button", "Neu hier").should("be.visible");

    // Beschriftungen stehen ueber den Feldern und verschwinden nicht beim Tippen.
    cy.contains("label", "E-Mail-Adresse").should("be.visible");
    cy.contains("label", "Passwort").should("be.visible");
    cy.get("#email").type("jemand@beispiel.de");
    cy.contains("label", "E-Mail-Adresse").should("be.visible");
  });

  it("erklaert beim Registrieren, was als Naechstes passiert", () => {
    cy.visit("/login");
    cy.contains("button", "Neu hier").click();
    cy.contains("Mindestens 6 Zeichen").should("be.visible");
    cy.contains("Bestätigung per E-Mail").should("be.visible");
  });

  it("meldet falsche Zugangsdaten auf Deutsch, nicht auf Englisch", () => {
    cy.visit("/login");
    cy.get("#email").type("gibtes@nicht.de");
    cy.get("#password").type("falschesPasswort");
    cy.contains("button", "Anmelden").click();

    cy.contains("stimmt nicht").should("be.visible");
    cy.contains("Invalid login credentials").should("not.exist");
    // Der Knopf darf nie haengen bleiben.
    cy.contains("button", "Anmelden").should("not.be.disabled");
  });

  it("antwortet auf API-Aufrufe ohne Anmeldung mit 401 und JSON", () => {
    cy.request({
      method: "POST",
      url: "/api/chat",
      body: {},
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body).to.have.property("error");
    });
  });
});
