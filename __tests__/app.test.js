import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../index.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  
});

/*
 Mini URL API 
  User Authentication
    should register a new use
    should not register a user with an existing email
    should log in an existing user and return a token
    should not log in with incorrect credentials
    should not log in with non-existent email
*/
