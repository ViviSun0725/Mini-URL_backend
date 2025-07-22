import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

beforeAll(() => {

});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Mini URL API", () => {
  describe("User Authentication", () => {
    it('should refister a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully');
      expect(res.body).toHaveProperty('userId');
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
