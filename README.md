 # ModernTech HR Management System

Full-stack HR management application with a Vue frontend, Express API, and MySQL database.

## Projects

- `Hr-Project-final-repo/` - Vue 3 and Vite frontend
- `hr-project-backend/` - Express and MySQL backend API

## Requirements

- Node.js 18 or newer
- MySQL 8 or compatible MySQL server

## Database Setup

1. Create a MySQL database using `hr-project-backend/schema.sql`.
2. Create `hr-project-backend/.env` using these values and replace the placeholders with your local credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=moderntech_hr
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
```

The schema creates the employee, department, user, attendance, leave, payroll, and performance review tables used by the API.

## Run the Backend

```bash
cd hr-project-backend
npm install
npm start
```

The API runs at `http://localhost:5000` and its routes are under `http://localhost:5000/api`.

## Run the Frontend

Open a second terminal:

```bash
cd Hr-Project-final-repo
npm install
npm run dev
```

Open the URL shown by Vite, usually `http://localhost:5173/Hr-Project-final-repo/`. The frontend uses `http://localhost:5000/api` by default. To use another API host, create `Hr-Project-final-repo/.env` with:

```env
VITE_API_URL=http://localhost:5000/api
```

## Demo Login

- HR username: `hr_admin`
- HR password: `MT2026!`
- Employee email: `sibongile.nkosi@moderntech.com`

Employee login also requires selecting the matching employee profile.

## Public Frontend

The deployed frontend is available at:

https://khanyamfunda.github.io/Hr-Project-final-repo/

The public frontend cannot access a database running on a local computer. A publicly hosted backend API and a production `VITE_API_URL` are required for database-backed features in the deployed site.
