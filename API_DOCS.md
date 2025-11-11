# Telegram File Upload System - API Documentation

## Overview

This document provides detailed information about the REST API endpoints available in the Telegram File Upload System. The API allows programmatic access to all system features including file uploads, chat management, and session handling.

## Base URL

All API endpoints are prefixed with `/api`

Example: `http://0.0.0.0:8405/api/upload`

## Admin Session

ยกเว้น `POST /api/upload` (ตรวจสอบด้วย `TOKEN_UPLOAD` เท่านั้น) ขอให้ล็อกอินที่ `/login` ให้สำเร็จ หรือส่งคำขอ `POST /auth/login` ด้วย `ADMIN_USERNAME` / `ADMIN_PASSWORD` เพื่อสร้าง session cookie ก่อนเรียกใช้ API อื่น ๆ ไม่เช่นนั้นจะได้ `401 Authentication required`.

ตัวอย่างการล็อกอินผ่าน cURL:

```
curl -c cookies.txt -b cookies.txt -L \
  -X POST http://0.0.0.0:8405/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "username=${ADMIN_USERNAME}" \
  --data-urlencode "password=${ADMIN_PASSWORD}"
```

## Authentication

### Save STRING_SESSION

Save a Telegram STRING_SESSION for authentication.

**Endpoint**: `POST /api/auth/session`

**Headers**:
- `Content-Type: application/json`

**Request Body**:
```json
{
  "string_session": "your_string_session_here"
}
```

**Response**:
```json
{
  "message": "Session saved successfully",
  "session": {
    "id": 1,
    "string_session": "your_string_session_here"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing STRING_SESSION
- `500 Internal Server Error`: Database error

### Get STRING_SESSION

Retrieve the saved Telegram STRING_SESSION.

**Endpoint**: `GET /api/auth/session`

**Response**:
```json
{
  "string_session": "your_string_session_here"
}
```

**Note**: This endpoint will first check for `TG_STRING_SESSION` in environment variables before falling back to the database.

**Error Responses**:
- `404 Not Found`: No session found
- `500 Internal Server Error`: Database error

### Clear Sessions

Remove all saved Telegram sessions.

**Endpoint**: `DELETE /api/auth/session`

**Response**:
```json
{
  "message": "All sessions cleared successfully"
}
```

**Note**: This only clears sessions stored in the database, not the environment variable.

### Logout

Clear stored STRING_SESSION and environment configuration.

**Endpoint**: `POST /api/auth/logout`

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses**:
- `500 Internal Server Error`: Failed to clear session

### Test Connection

Test the Telegram connection using the saved session.

**Endpoint**: `GET /api/auth/test`

**Response**:
```json
{
  "message": "Telegram connection successful",
  "connected": true
}
```

**Note**: This endpoint will first check for `TG_STRING_SESSION` in environment variables before falling back to the database.

**Error Responses**:
- `400 Bad Request`: No Telegram session found
- `500 Internal Server Error`: Telegram API credentials not configured or connection failed

### Initialize Telegram from Environment

Initialize the Telegram connection using `TG_STRING_SESSION` from environment variables.

**Endpoint**: `POST /api/telegram/init`

**Response**:
```json
{
  "message": "Telegram connection initialized successfully from environment variables",
  "connected": true
}
```

**Error Responses**:
- `400 Bad Request`: TG_STRING_SESSION not set in environment or API credentials missing
- `500 Internal Server Error`: Connection failed

### Send Telegram Verification Code

Initiate the login flow by sending a verification code to the user's Telegram account.

**Endpoint**: `POST /api/auth/send-code`

**Request Body**:
```json
{
  "api_id": "your_api_id",
  "api_hash": "your_api_hash",
  "phone_number": "+1234567890"
}
```

**Response**:
```json
{
  "message": "Verification code sent successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Missing parameters
- `500 Internal Server Error`: Failed to send code

### Confirm Telegram Verification Code

Validate the verification code and persist the resulting STRING_SESSION.

**Endpoint**: `POST /api/auth/confirm-code`

**Request Body**:
```json
{
  "api_id": "your_api_id",
  "api_hash": "your_api_hash",
  "phone_number": "+1234567890",
  "code": "12345"
}
```

**Response**:
```json
{
  "message": "Telegram authenticated successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Missing parameters
- `500 Internal Server Error`: Code verification failed or two-factor authentication required

## File Management

### Upload a File

Upload a file to Telegram.

**Endpoint**: `POST /api/upload`

**Headers**:
- `Content-Type: multipart/form-data`

**Form Data**:
- `file`: The file to upload
- `chat_id`: The Telegram chat ID to send the file to
- `token_upload`: Shared secret token that must match the server-side `TOKEN_UPLOAD`
- `chat_name` (optional): A name to associate with the chat ID
- `message_thread_id` (optional): Thread/Topic ID for posting inside forums (supergroups)
- `caption` (optional): Caption text to accompany the file (max 1024 characters)

**Response**:
```json
{
  "message": "File uploaded successfully",
  "file": {
    "id": 1,
    "filename": "example.pdf",
    "filepath": "uploads/1640995200000-example.pdf",
    "chat_id": "123456789",
    "chat_name": "My Group",
    "caption": "Invoice for September",
    "status": "uploaded",
    "hash": "a1b2c3d4e5f6...",
    "local_deleted": true,
    "local_deleted_at": "2025-01-01T00:05:01.000Z"
  },
  "telegram_result": {
    // Telegram API response
  }
}
```

**Note**: The system will automatically use `TG_STRING_SESSION` from environment variables if available, falling back to the database-stored session if not.

**Error Responses**:
- `400 Bad Request`: No file uploaded, Chat ID missing, or caption length exceeds 1024 characters
- `403 Forbidden`: Upload token missing or invalid
- `500 Internal Server Error`: Upload failed or Telegram API error

### Get All Files

Retrieve a list of all uploaded files.

**Endpoint**: `GET /api/files`

**Response**:
```json
[
  {
    "id": 1,
    "filename": "example.pdf",
    "filepath": "uploads/1640995200000-example.pdf",
    "status": "uploaded",
    "hash": "a1b2c3d4e5f6...",
    "chat_id": "123456789",
    "chat_name": "My Group",
    "local_deleted": true,
    "local_deleted_at": "2025-01-01T00:05:01.000Z",
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:05:00.000Z"
  }
]
```

**Error Responses**:
- `500 Internal Server Error`: Database error

### Get a Specific File

Retrieve information about a specific file by ID.

**Endpoint**: `GET /api/files/:id`

**Response**:
```json
{
  "id": 1,
  "filename": "example.pdf",
  "filepath": "uploads/1640995200000-example.pdf",
  "status": "uploaded",
  "hash": "a1b2c3d4e5f6...",
  "chat_id": "123456789",
  "chat_name": "My Group",
  "local_deleted": true,
  "local_deleted_at": "2025-01-01T00:05:01.000Z",
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:05:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: File not found
- `500 Internal Server Error`: Database error

### Verify File Integrity

Verify the integrity of a file using its SHA256 hash.

**Endpoint**: `GET /api/files/:id/verify`

**Response**:
```json
{
  "file_id": 1,
  "valid": null,
  "message": "Local file already removed from server storage after upload."
}
```

**Error Responses**:
- `404 Not Found`: File not found
- `500 Internal Server Error`: Verification failed or database error
- `200 OK` with `"valid": null`: Local file not present anymore (expected after successful upload)

## Chat Management

### Set Chat Name

Associate a name with a chat ID for easier identification.

**Endpoint**: `POST /api/chat-name`

**Headers**:
- `Content-Type: application/json`

**Request Body**:
```json
{
  "chat_id": "123456789",
  "chat_name": "My Group"
}
```

**Response**:
```
```

#### Delete Chat Mapping

```
DELETE /api/chat-mappings/:id
```

Removes a mapping by its ID.