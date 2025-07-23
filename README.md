# Mini URL Backend

This is the backend service for the Mini URL application. It provides RESTful APIs for user authentication, URL shortening, redirection, and management.

You can try it out at [Mini URL](https://miniurl.zeabur.app/)

For the frontend service, visit the [Mini URL Frontend](https://github.com/ViviSun0725/Mini-URL_frontend) repository.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
## Features

- User registration and authentication (JWT)
- Shorten long URLs
- Custom short codes
- Password-protected URLs
- URL redirection
- User-specific URL management
- Rate limiting for API endpoints

## Technologies Used

- Node.js
- Express.js (Web Framework)
- Prisma (ORM for database interaction)
- PostgreSQL (Database)
- bcrypt (Password hashing)
- jsonwebtoken (JWT for authentication)
- nanoid (for generating short codes)
- dotenv (for environment variable management)
- express-validator (for request validation)
- express-rate-limit (for rate limiting)
- Vitest (Testing Framework)
- Supertest (for HTTP assertions in tests)
- cross-env (for cross-platform environment variable setting)

## Getting Started

Follow these instructions to set up and run the backend locally.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (Node Package Manager)
- PostgreSQL database server

### Installation

1.  Navigate to the `Backend` directory:
    ```bash
    cd Backend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the `Backend` directory based on the `.env.template` file. This file will store your sensitive configuration.

```
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/your_database_name?schema=public"
JWT_SECRET="your_jwt_secret_key"
PORT=3000
FRONTEND_BASE_URL="http://localhost:5173" # Or your frontend's URL
```

For testing, create a `.env.test` file with a separate database URL to avoid corrupting your development database:

```
# .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/your_test_database_name?schema=public"
JWT_SECRET="your_test_jwt_secret_key"
PORT=3001 # Or any other port for tests
FRONTEND_BASE_URL="http://localhost:5173"
```

**Important:** Ensure your `DATABASE_URL` in `.env` points to your development database and `DATABASE_URL` in `.env.test` points to your test database.

### Database Setup

1.  Ensure your PostgreSQL server is running.
2.  Create the databases specified in your `.env` and `.env.test` files (e.g., `your_database_name`, `your_test_database_name`).
3.  Run Prisma migrations to set up your database schema:
    ```bash
    npm run migrate
    ```
    This command will apply the migrations defined in `prisma/migrations` to the database specified in your `.env` file.

### Running the Application

-   **Development Mode (with Nodemon for auto-restarts):**
    ```bash
    npm run dev
    ```
    The server will run on the `PORT` specified in your `.env` file (default: 3000).

-   **Production Mode:**
    ```bash
    npm start
    ```

## Running Tests

To run the test suite, which uses the database specified in `.env.test`:

```bash
npm test
```