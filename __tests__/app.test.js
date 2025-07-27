import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../index.js";
import getPrismaClient from "../src/configs/prisma.js";
const prisma = getPrismaClient();
import bcrypt from "bcrypt";

const frontendBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

beforeAll(() => {});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.url.deleteMany();
  await prisma.user.deleteMany();
});

describe("Mini URL API", () => {
  describe("User Authentication", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
      });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty(
        "message",
        "User registered successfully"
      );
      expect(res.body).toHaveProperty("userId");
    });

    it("should not register a user with an existing email", async () => {
      await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
      });
      const res = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "anotherpassword",
      });
      expect(res.statusCode).toEqual(409);
      expect(res.body.error).toEqual("User with this email already exists.");
    });
    it("should log in an exitsting user and return a token", async () => {
      await request(app).post("/api/auth/register").send({
        email: "login@example.com",
        password: "password123",
      });
      const res = await request(app).post("/api/auth/login").send({
        email: "login@example.com",
        password: "password123",
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual("Logged in successfully.");
      expect(res.body).toHaveProperty("token");
    });

    it("should not log in with incorrect credentials", async () => {
      await request(app).post("/api/auth/register").send({
        email: "wrongpass@example.com",
        password: "password123",
      });
      const res = await request(app).post("/api/auth/login").send({
        email: "wrongpass@example.com",
        password: "wrongpassword",
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body.error).toEqual("Invalid email or password");
    });

    it("should not log in with non-existent email", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body.error).toEqual("Invalid email or password");
    });
  });

  describe("POST /api/urls/shorten", () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      await prisma.url.deleteMany({}); // Clean URLs before each test
      await prisma.user.deleteMany({}); // Clean users before each test

      const registerRes = await request(app).post("/api/auth/register").send({
        email: "user@example.com",
        password: "password123",
      });
      userId = registerRes.body.userId;

      const loginRes = await request(app).post("/api/auth/login").send({
        email: "user@example.com",
        password: "password123",
      });
      authToken = loginRes.body.token;
    });

    it("should create a new short URL for an authenticated user", async () => {
      const res = await request(app)
        .post("/api/urls/shorten")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          originalUrl: "https://google.com",
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("shortUrl");
      const urlInDb = await prisma.url.findFirst({
        where: { originalUrl: "https://google.com" },
      });
      expect(urlInDb).not.toBeNull();
      expect(urlInDb.userId).toEqual(userId);
    });
  });

  describe("GET /:shortCode", () => {
    it("should redirect to the frontend rediract page for a valid short code", async () => {
      const url = await prisma.url.create({
        data: {
          originalUrl: "https:github.com",
          shortCode: "github",
        },
      });

      const res = await request(app).get(`/${url.shortCode}`);
      expect(res.statusCode).toEqual(302);
      expect(res.header.location).toEqual(`${frontendBase}/${url.shortCode}`);
    });

    it("should return 404 for a non-existent short code", async () => {
      const res = await request(app).get("/nonexistentcode");
      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual("URL not found or inactive");
    });

    it("should return 404 for an inactive URL", async () => {
      const url = await prisma.url.create({
        data: {
          originalUrl: "https://example.com",
          shortCode: "inactive",
          isActive: false,
        },
      });

      const res = await request(app).get(`/${url.shortCode}`);
      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual("URL not found or inactive");
    });
  });

  describe("POST /api/urls/verify-password (Password Varification for URLs)", async () => {
    const password = "test-password";
    const hashedPassword = await bcrypt.hash(password, 10);
    let protectedShortCode;
    let userId;
    let authToken;

    beforeEach(async () => {
      await prisma.url.deleteMany({});
      await prisma.user.deleteMany({});

      const url = await prisma.url.create({
        data: {
          originalUrl: "https://protected.com",
          shortCode: "protected",
          password: hashedPassword,
        },
      });
      protectedShortCode = url.shortCode;
    });

    it("should redirect to the protected link page for a password-protected URL", async () => {
      const res = await request(app).get(`/${protectedShortCode}`);
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toEqual(
        `${frontendBase}/protected-link/${protectedShortCode}`
      );
    });

    it("should return the original URL with correct password", async () => {
      const res = await request(app).post(`/api/urls/verify-password`).send({
        shortCode: protectedShortCode,
        password: password,
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("originalUrl");
      expect(res.body.originalUrl).toBe("https://protected.com");
    });
    it("should return 401 for incorrect password", async () => {
      const res = await request(app).post(`/api/urls/verify-password`).send({
        shortCode: protectedShortCode,
        password: "incorrect-password",
      });
      expect(res.statusCode).toEqual(401);
    });
    it("should fail if shortCode is missing", async () => {
      const res = await request(app).post(`/api/urls/verify-password`).send({
        password: password,
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].msg).toEqual("Short code is required");
    });
    it("should fail if password is missing", async () => {
      const res = await request(app).post(`/api/urls/verify-password`).send({
        shortCode: protectedShortCode,
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].msg).toEqual("Password is required");
    });
    it("should fail for a url without a password", async () => {
      const url = await prisma.url.create({
        data: {
          originalUrl: "https://not-protected.com",
          shortCode: "not-protected",
        },
      });
      const res = await request(app).post(`/api/urls/verify-password`).send({
        shortCode: url.shortCode,
        password: password,
      });
      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual("URL not found or does not require a password");
    });
  });
  describe("GET /api/urls/url-details/:shortCode (for frontend to check password status and description)", async () => {
    const password = "test-password";
    const hashedPassword = await bcrypt.hash(password, 10);

    beforeEach(async () => {
      await prisma.url.deleteMany({});
      await prisma.user.deleteMany({});
    });

    it("should get URL details for a protected link", async () => {
      const url = await prisma.url.create({
        data: {
          originalUrl: "https://protected.com",
          shortCode: "protected",
          description: "I am protected",
          password: hashedPassword,
        },
      });
      const res = await request(app).get(
        `/api/urls/url-details/${url.shortCode}`
      );
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("description");
      expect(res.body).toHaveProperty("requiresPassword");
      expect(res.body.requiresPassword).toBe(true);
    });
    it("should get URL details for an unportected link", async () => {
      const url = await prisma.url.create({
        data: {
          originalUrl: "https://not-protected.com",
          shortCode: "not-protected",
          description: "I am not protected",
        },
      });

      const res = await request(app).get(
        `/api/urls/url-details/${url.shortCode}`
      );
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("description");
      expect(res.body).toHaveProperty("requiresPassword");
      expect(res.body.requiresPassword).toBe(false);
    });
    it("should return 404 for non-existent shortcode", async () => {
      const res = await request(app).get(
        `/api/urls/url-details/nonexistent-shortCode`
      );
      expect(res.statusCode).toEqual(404);
    });
  });
  describe("URL Details and Management (Authenticated) (CRUD)", async () => {
    let userId;
    let userAuthToken;
    let anotherUserId;
    let anotherUserAuthToken;
    let urlId;

    beforeEach(async () => {
      await prisma.url.deleteMany({});
      await prisma.user.deleteMany({});
      const userRes = await request(app).post("/api/auth/register").send({
        email: "user@example.com",
        password: "password123",
      });
      userId = userRes.body.userId;

      const userLoginRes = await request(app).post("/api/auth/login").send({
        email: "user@example.com",
        password: "password123",
      });
      userAuthToken = userLoginRes.body.token;

      const anotherUserRes = await request(app)
        .post("/api/auth/register")
        .send({
          email: "anotherUser@example.com",
          password: "password123",
        });
      anotherUserId = anotherUserRes.body.userId;

      const anotherUserLoginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "anotherUser@example.com",
          password: "password123",
        });
      anotherUserAuthToken = anotherUserLoginRes.body.token;
    });
    describe("PUT /api/urls/:id", () => {
      it("should return 401 if no token was provided", async () => {
        const urlRes = await request(app)
          .post("/api/urls/shorten")
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send({
            originalUrl: "https://google.com",
          });
        const urlId = urlRes.body.id;
        const payload = {
          description: "Google",
        };
        const res = await request(app).put(`/api/urls/${urlId}`).send(payload);
        expect(res.statusCode).toEqual(401);
        expect(res.body.error).toEqual("Authentication token required.");
      });

      it("soulld return 404 if the URL doesn't exist", async () => {
        const payload = {
          description: "Google",
        };
        const res = await request(app)
          .put(`/api/urls/999999999`)
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send(payload);
        expect(res.statusCode).toEqual(404);
      });
      it("should return 403 when trying to update a URL not owned by the user", async () => {
        const urlRes = await request(app)
          .post("/api/urls/shorten")
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send({
            originalUrl: "https://google.com",
          });
        const urlId = urlRes.body.id;
        const payload = {
          description: "Google",
        };
        const res = await request(app)
          .put(`/api/urls/${urlId}`)
          .set("Authorization", `Bearer ${anotherUserAuthToken}`)
          .send(payload);
        expect(res.statusCode).toEqual(403);
      });

      it("should be able to update originalURL field", async () => {
        const urlRes = await request(app)
          .post("/api/urls/shorten")
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send({
            originalUrl: "https://google.com",
          });
        const urlId = urlRes.body.id;
        const newUrl = "https://www.youtube.com/";
        const payload = {
          originalUrl: newUrl,
        };
        const res = await request(app)
          .put(`/api/urls/${urlId}`)
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send(payload);
        expect(res.statusCode).toEqual(200);
        expect(res.body.url.originalUrl).toEqual(newUrl);
      });
      it.todo("should be able to update customShortCode field", async () => {
        const urlRes = await request(app)
          .post("/api/urls/shorten")
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send({
            originalUrl: "https://google.com",
          });
        const urlId = urlRes.body.id;
        const newCode = "google";
        const payload = {
          customShortCode: newCode,
        };
        const res = await request(app)
          .put(`/api/urls/${urlId}`)
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send(payload);
        expect(res.statusCode).toEqual(200);
        expect(res.body.url.customShortCode).toEqual(newCode);
      });
      it("should be able to update description field", async () => {
        const urlRes = await request(app)
          .post("/api/urls/shorten")
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send({
            originalUrl: "https://google.com",
          });
        const urlId = urlRes.body.id;
        const newDescription = "https://www.youtube.com/";
        const payload = {
          description: newDescription,
        };

        const res = await request(app)
          .put(`/api/urls/${urlId}`)
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send(payload);
        expect(res.statusCode).toEqual(200);
        expect(res.body.url.description).toEqual(newDescription);
      });
      it("should be able to update isActive field", async () => {
        const urlRes = await request(app)
          .post("/api/urls/shorten")
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send({
            originalUrl: "https://google.com",
          });
        const urlId = urlRes.body.id;
        let newIsActive = false;
        const payload = {
          isActive: newIsActive,
        };
        const res = await request(app)
          .put(`/api/urls/${urlId}`)
          .set("Authorization", `Bearer ${userAuthToken}`)
          .send(payload);
        expect(res.statusCode).toEqual(200);
        expect(res.body.url.isActive).toEqual(false);
      });
    });
  });
  describe.todo("GET /api/page/page-details");
});

/**
 * TODO:
 * split tests into different test files
 * test input data types using zod
 */
