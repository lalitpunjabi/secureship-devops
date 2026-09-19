const request = require("supertest");
const app = require("../server");

describe("SecureShip API", () => {
  test("GET / should return 200", async () => {
    const response = await request(app)
      .get("/")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.status).toBe("success");
    expect(response.body.service).toBe("secureship-api");
  });

  test("GET /health should return healthy status", async () => {
    const response = await request(app)
      .get("/health")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.status).toBe("healthy");
    expect(response.body.service).toBe("secureship-api");
    expect(response.body.timestamp).toBeDefined();
  });

  test("GET /api/info should return application information", async () => {
    const response = await request(app)
      .get("/api/info")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.application).toBe("SecureShip");
    expect(response.body.version).toBe("1.0.0");
  });

  test("GET unknown route should return 404", async () => {
    const response = await request(app)
      .get("/invalid-route")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body.status).toBe("error");
  });
});