/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Creates a brand new account and ends up signed in on the overview. */
      registerFreshUser(): Chainable<string>;
      /** Creates a notebook and returns its URL. */
      createNotebook(): Chainable<void>;
      /** Adds a pasted text source to the open notebook. */
      addTextSource(title: string, body: string): Chainable<void>;
      realHoverFallback(): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add("registerFreshUser", () => {
  // A fresh address per run, so the suite never collides with itself.
  const email = `cypress-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
  cy.visit("/login");
  cy.contains("button", "Neu hier").click();
  cy.get("#email").type(email);
  cy.get("#password").type("cypress-test-123");
  cy.contains("button", "Konto anlegen").click();
  cy.location("pathname", { timeout: 20_000 }).should("eq", "/");
  return cy.wrap(email);
});

Cypress.Commands.add("createNotebook", () => {
  cy.contains("button", "Neues Notebook").click();
  cy.location("pathname", { timeout: 20_000 }).should("match", /^\/notebook\//);
});

Cypress.Commands.add("addTextSource", (title: string, body: string) => {
  cy.contains("button", "Text einfügen").click();
  cy.get('input[placeholder="Titel"]').type(title);
  cy.get("textarea").type(body, { delay: 0 });
  cy.contains("button", "Hinzufügen").click();
  cy.get('[data-testid="source-item"]', { timeout: 40_000 })
    .should("contain.text", title);
});

export {};

// The delete button only becomes visible on hover. Cypress cannot really
// hover, so this just makes the intent explicit at the call site; the click
// itself uses { force: true }.
Cypress.Commands.add(
  "realHoverFallback",
  { prevSubject: "element" },
  (subject) => cy.wrap(subject).trigger("mouseover"),
);
