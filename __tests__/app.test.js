import dotenv from 'dotenv'
dotenv.config({ path: '.env.test' })
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../index.js";
import prisma from '../src/configs/prisma.js';
import bcrypt from "bcrypt";


const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'; 


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

  describe("Password Protection", () => {
    const password = "test-password";
    let hashedPassword;
    let protectedShortCode;
    let authToken;
    let userId;

    beforeEach(async () => {
      await prisma.url.deleteMany({});
      await prisma.user.deleteMany({});

      const registerRes = await request(app).post("/api/auth/register").send({
        email: "authuser_protected@example.com",
        password: "password123",
      });
      userId = registerRes.body.userId;

      const loginRes = await request(app).post("/api/auth/login").send({
        email: "authuser_protected@example.com",
        password: "password123",
      });
      authToken = loginRes.body.token;

      hashedPassword = await bcrypt.hash(password, 10);
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
  });
});
