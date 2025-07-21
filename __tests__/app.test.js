import request from 'supertest';
import app from '../index.js';
import { PrismaClient } from '@prisma/client';

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
