# HR Backend API Documentation

## Base URL

```
http://localhost:5000
```

---

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Test Credentials

| Username         | Password   | Role     | Employee ID |
| ---------------- | ---------- | -------- | ----------- |
| `lungile_hr`     | `password` | HR Staff | 2           |
| `naledi_ops`     | `password` | Manager  | 7           |
| `sihongile_dev`  | `password` | Employee | 1           |
| `thabo_qa`       | `password` | Employee | 3           |
| `keshav_sales`   | `password` | Employee | 4           |
| `zanele_mkt`     | `password` | Employee | 5           |
| `sipho_design`   | `password` | Employee | 6           |
| `farai_content`  | `password` | Employee | 8           |
| `karabo_fin`     | `password` | Manager  | 9           |
| `fatima_support` | `password` | Employee | 10          |

---

## Endpoints

### 1. User Registration

**POST** `/api/auth/register`

Register a new user account.

**Request:**

```json
{
  "employee_id": 1,
  "username": "new_user",
  "password": "password123",
  "role": "Employee"
}
```

**Response (201):**

```json
{
  "message": "Secure user account created successfully!"
}
```

**Error (400):**

```json
{
  "error": "Username or employee profile already registered!"
}
```

---

### 2. User Login

**POST** `/api/auth/login`

Authenticate and receive a JWT token.

**Request:**

```json
{
  "username": "lungile_hr",
  "password": "password"
}
```

**Response (200):**

```json
{
  "message": "Login authorized!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "HR Staff",
  "username": "lungile_hr"
}
```

**Error (401):**

```json
{
  "error": "Invalid username or password!"
}
```

---

### 3. Get All Leave Requests

**GET** `/api/leave-requests`

Retrieve all leave requests (requires authentication).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
[
  {
    "id": 1,
    "first_name": "Sihongile",
    "last_name": "Nkosi",
    "start_date": "2025-07-22T00:00:00.000Z",
    "end_date": "2025-07-25T00:00:00.000Z",
    "reason": "Sick Leave",
    "status": "Approved"
  },
  {
    "id": 2,
    "first_name": "Sihongile",
    "last_name": "Nkosi",
    "start_date": "2025-12-01T00:00:00.000Z",
    "end_date": "2025-12-05T00:00:00.000Z",
    "reason": "Personal",
    "status": "Pending"
  }
]
```

**Error (401):**

```json
{
  "error": "No token provided!"
}
```

---

### 4. Submit New Leave Request

**POST** `/api/leave-requests`

Create a new leave request (requires authentication).

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request:**

```json
{
  "employee_id": 1,
  "start_date": "2026-09-01",
  "end_date": "2026-09-03",
  "reason": "Vacation"
}
```

**Response (201):**

```json
{
  "message": "Leave request submitted successfully!",
  "requestId": 14
}
```

**Error (400):**

```json
{
  "error": "All fields are required."
}
```

**Error (400):**

```json
{
  "error": "Dates must be valid and in YYYY-MM-DD format."
}
```

---

### 5. Approve/Deny Leave Request

**PATCH** `/api/leave-requests/:id`

Update leave request status to Approved or Denied (requires **HR Staff** or **Manager** role).

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request:**

```json
{
  "status": "Approved"
}
```

Or:

```json
{
  "status": "Denied"
}
```

**Response (200):**

```json
{
  "message": "Leave request status updated to Approved."
}
```

**Error (400):**

```json
{
  "error": "Invalid status. Must be 'Approved' or 'Denied'."
}
```

**Error (404):**

```json
{
  "error": "Leave request not found."
}
```

---

## Thunder Client Test Flow

### Step 1: Login

1. **Method:** POST
2. **URL:** `http://localhost:5000/api/auth/login`
3. **Headers:** `Content-Type: application/json`
4. **Body (raw/JSON):**

```json
{
  "username": "lungile_hr",
  "password": "password"
}
```

5. **Copy the returned `token` value**

### Step 2: Get All Leave Requests

1. **Method:** GET
2. **URL:** `http://localhost:5000/api/leave-requests`
3. **Headers:** `Authorization: Bearer <paste-your-token-here>`
4. **Send**

### Step 3: Submit Leave Request

1. **Method:** POST
2. **URL:** `http://localhost:5000/api/leave-requests`
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer <paste-your-token-here>`
4. **Body (raw/JSON):**

```json
{
  "employee_id": 1,
  "start_date": "2026-09-10",
  "end_date": "2026-09-12",
  "reason": "Vacation"
}
```

5. **Copy the returned `requestId`**

### Step 4: Approve Leave Request

1. **Method:** PATCH
2. **URL:** `http://localhost:5000/api/leave-requests/<paste-requestId-here>`
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer <paste-your-token-here>`
4. **Body (raw/JSON):**

```json
{
  "status": "Approved"
}
```

5. **Send**

---

## Error Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Resource created                     |
| 400  | Bad request (missing/invalid fields) |
| 401  | Unauthorized (missing/invalid token) |
| 404  | Resource not found                   |
| 500  | Server error                         |

---

## Notes

- All dates must be in **YYYY-MM-DD** format
- Start date cannot be after end date
- Only **HR Staff** and **Manager** roles can approve/deny leave requests
- JWT tokens expire after **4 hours**
- Database: `moderntech_hr` at `localhost:3307`
