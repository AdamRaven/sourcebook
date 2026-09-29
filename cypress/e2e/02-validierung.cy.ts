/// <reference types="cypress" />

describe("Eingabepruefung der API", () => {
  beforeEach(() => {
    cy.registerFreshUser();
  });

  it("weist eine kaputte Notebook-Kennung ab", () => {
    cy.request({
      method: "POST",
      url: "/api/chat",
      body: { notebookId: "keine-uuid", question: "Hallo" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.contain("Kennung");
    });
  });

  it("weist eine leere Frage ab", () => {
    cy.request({
      method: "POST",
      url: "/api/chat",
      body: {
        notebookId: "00000000-0000-0000-0000-000000000000",
        question: "   ",
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it("weist eine uebergrosse Quelle ab, statt sie zu verarbeiten", () => {
    cy.request({
      method: "POST",
      url: "/api/ingest",
      body: {
        notebookId: "00000000-0000-0000-0000-000000000000",
        title: "Zu gross",
        kind: "text",
        content: "x".repeat(600_000),
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.contain("zu gross");
    });
  });

  it("weist einen voellig unbrauchbaren Rumpf ab", () => {
    cy.request({
      method: "POST",
      url: "/api/ingest",
      body: { unsinn: true },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property("error");
    });
  });
});
