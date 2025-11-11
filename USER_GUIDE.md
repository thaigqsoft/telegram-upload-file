# Telegram File Upload System - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Getting Started](#getting-started)
6. [Using the Dashboard](#using-the-dashboard)
7. [API Usage](#api-usage)
8. [Authentication](#authentication)
9. [File Management](#file-management)
10. [Chat Management](#chat-management)
11. [Troubleshooting](#troubleshooting)
12. [Security Best Practices](#security-best-practices)

## Introduction

The Telegram File Upload System is a comprehensive solution that allows you to upload files to Telegram using the MTProto API. This system provides a web-based dashboard and REST API for managing file uploads, with features including:

- Support for large file uploads (up to 2GB)
- Secure storage of Telegram session data
- File integrity verification using SHA256 hashes
- Progress tracking with visual indicators
- Caption support for each upload (optional text up to 1024 characters)
- Automatic cleanup of local files after a successful Telegram upload (metadata + hash remain in SQLite)
- Admin login gate to protect the dashboard and APIs (username/password from environment)
- Upload token security (require matching `TOKEN_UPLOAD` for every API/dashboard upload)
- Chat ID naming for easy identification
- Comprehensive file management
- Environment-based configuration support
- Dashboard login authentication
- Filename normalization สำหรับไฟล์ที่อัปโหลดจาก Linux CLI หรือมีอักขระพิเศษ

## System Requirements

- Node.js version 14 or higher
- npm version 6 or higher
- Telegram API credentials (API ID and API Hash)
- At least 500MB of free disk space for file storage
- Internet connection for Telegram communication

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd telegram-upload-file
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Required Directories

```bash
mkdir -p uploads database
```

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following content:

```env
# Telegram API Configuration
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
TG_STRING_SESSION=your_string_session_here

# Server Configuration
HOST=0.0.0.0
PORT=8405

# Admin Login
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
SESSION_SECRET=super_secret_session_key

# Database Configuration
DATABASE_PATH=./database/app.db

# Upload Security
TOKEN_UPLOAD=your_secure_token_here
```

### Getting Telegram API Credentials

1. Visit [Telegram Apps](https://my.telegram.org/apps)
2. Log in with your Telegram account
3. Create a new application
4. Copy the `api_id` and `api_hash` values
5. Paste them into your `.env` file

### Getting Your STRING_SESSION

To authenticate with Telegram, you need a STRING_SESSION. This can be obtained through various methods:

1. **Using a Telegram client library** (recommended for developers)
2. **Using the Telegram Desktop app** with developer tools
3. **Using online tools** (use with caution)

### Configuring TG_STRING_SESSION

You can configure the Telegram STRING_SESSION in three ways:

1. **Environment Variable (Recommended)**:
   Set the `TG_STRING_SESSION` in your `.env` file:
   ```
   TG_STRING_SESSION=your_actual_string_session_here
   ```

2. **Dashboard Login Form**:
   When you first access the dashboard, you'll be prompted to enter your:
   - Telegram API ID
   - Telegram API Hash
   - Phone Number
   
   You'll receive a verification code in Telegram. Enter the code to complete the login and automatically save the STRING_SESSION to the database.

3. **Database Storage via API**:
   Use the API to save your STRING_SESSION to the database (see [Authentication](#authentication))

## Getting Started

### Starting the Server

To start the server in production mode:

```bash
npm start
```

To start the server in development mode (with auto-reload):

```bash
npm run dev
```

The server will start on `http://0.0.0.0:8405` by default.

### Initial Setup

1. Start the server
2. Open your browser and navigate to `http://0.0.0.0:8405/login`
3. ล็อกอินด้วย `ADMIN_USERNAME` / `ADMIN_PASSWORD` ที่ตั้งค่าไว้ใน `.env`
4. เมื่อล็อกอินสำเร็จ ระบบจะพาเข้าสู่แดชบอร์ดหลัก
5. หากยังไม่ได้ตั้งค่า `TG_STRING_SESSION` จะปรากฎฟอร์มเพื่อเชื่อมต่อ Telegram (ตามขั้นตอนเดิม)
6. กรอก Verification Code และกด “Verify Code”
7. ระบบจะบันทึก STRING_SESSION ลงฐานข้อมูลและพาเข้าสู่ Dashboard เพื่ออัปโหลดไฟล์
8. หากต้องการออกจากระบบผู้ดูแล ให้กดปุ่ม “ออกจากระบบผู้ดูแล” มุมขวาบน ระบบจะล้าง session และพากลับไปที่หน้า login
9. ปุ่ม “ล้างการเชื่อมต่อ Telegram” (สีดำ) ยังใช้เพื่อลบ STRING_SESSION ออกจากฐานข้อมูลและตัดการเชื่อมต่อ Telegram client

## Using the Dashboard

The web dashboard provides a user-friendly interface for managing file uploads with authentication.

### Login Section

When you first access the dashboard and don't have a session configured via environment variables, you'll see a login form that asks for:

1. **STRING_SESSION**: Your Telegram STRING_SESSION
2. **API ID**: Your Telegram API ID
3. **API Hash**: Your Telegram API Hash

After submitting this form, your credentials will be saved to the SQLite3 database and tested for connectivity.

### Upload Section

1. **Select File**: Click the "Choose File" button to select a file from your computer
2. **Enter Chat ID**: Enter the Telegram chat ID where you want to send the file
3. **(Optional) Enter Chat Name**: Provide a name for the chat ID for easier identification
4. **(Optional) Add Caption**: ใส่ข้อความสั้น ๆ (ไม่เกิน 1024 ตัวอักษร) เพื่อแนบไปกับไฟล์ใน Telegram
5. **Enter Upload Token**: กรอกค่าที่ตรงกับ `TOKEN_UPLOAD` ในเซิร์ฟเวอร์ (ต้องตรงทุกครั้ง)
6. **Upload**: Click the "Upload to Telegram" button to start the upload process

During the upload, you'll see a progress bar showing the upload percentage.

> ℹ️ หลังจากไฟล์ถูกส่งไปยัง Telegram สำเร็จ ระบบจะลบไฟล์ต้นฉบับออกจากโฟลเดอร์ `uploads/` โดยอัตโนมัติ เหลือไว้เพียง metadata, hash และผลลัพธ์ในฐานข้อมูล

### Files Section

This section displays all uploaded files with the following information:
- File Name
- Chat ID
- Chat Name (if provided)
- Status (pending, uploaded, failed) — ถ้าเป็น <code>pending</code> จะมี progress bar เคลื่อนไหวให้เห็น
- Local File badge แสดงว่าไฟล์ต้นฉบับยังอยู่ (<code>Stored</code>) หรือถูกลบแล้ว (<code>Local Removed</code>)
- Upload Date
- Verification button (จะถูกปิดการใช้งานอัตโนมัติถ้าไฟล์ถูกลบจากเครื่องเซิร์ฟเวอร์แล้ว)
- Delete button เพื่อ ลบไฟล์ออกจากระบบ (มีการยืนยันก่อนลบ และกราฟจะอัปเดตอัตโนมัติ)
- ปุ่ม “ออกจากระบบผู้ดูแล” มุมขวาบนจะออกจากระบบผู้ดูแล ส่วนปุ่ม “ล้างการเชื่อมต่อ Telegram” จะล้าง STRING_SESSION ของ Telegram

### Chat Mappings Section

- ใช้ฟอร์มด้านบนเพื่อเพิ่ม mapping ระหว่าง Chat ID กับชื่อที่จำง่าย
- สามารถกดปุ่ม “Edit” ที่แต่ละแถวเพื่อแก้ไขชื่อ (Chat ID จะถูกล็อกเพื่อป้องกันความผิดพลาด) หรือ “Delete” เพื่อลบ mapping
- เมื่อกด “Add Mapping” หรือ “Update Mapping” ระบบจะบันทึกและแสดงในตารางทันที (มีปุ่ม Refresh สำรอง)
- ตารางด้านล่างแสดง mapping ทั้งหมดที่มีอยู่

## API Usage

The system provides a REST API for programmatic access to all features.

### Base URL

All API endpoints are prefixed with `/api`

Example: `http://0.0.0.0:8405/api/upload`

### Authentication Endpoints

#### Save STRING_SESSION
```
POST /api/auth/session
Content-Type: application/json

{
  "string_session": "your_string_session_here"
}
```

#### Get STRING_SESSION
```
GET /api/auth/session
```

**Note**: This endpoint will first check for `TG_STRING_SESSION` in environment variables before falling back to the database.

#### Clear Sessions
```
DELETE /api/auth/session
```

**Note**: This only clears sessions stored in the database, not the environment variable.

#### Test Connection
```
GET /api/auth/test
```

**Note**: This endpoint will first check for `TG_STRING_SESSION` in environment variables before falling back to the database.

#### Initialize Telegram from Environment
```
POST /api/telegram/init
```

Initialize the Telegram connection using `TG_STRING_SESSION` from environment variables.

#### Logout
```
POST /api/auth/logout
```

- `POST /api/auth/logout` – ลบ STRING_SESSION และออกจากระบบ

### File Upload Endpoints

#### Upload a File
```
POST /api/upload
Content-Type: multipart/form-data

Fields:
- file: ไฟล์ที่ต้องการอัปโหลด
- chat_id: Chat ID หรือ Channel ID ปลายทาง
- token_upload: (Required) ค่าที่ต้องตรงกับ `TOKEN_UPLOAD` ใน environment เพื่ออนุญาตให้ส่งไฟล์
- chat_name: (Optional) ชื่อที่ต้องการบันทึกไว้สำหรับอ้างอิง
- message_thread_id: (Optional) ใช้ส่งโพสต์เข้า Topic ของ supergroup/forums
- caption: (Optional) ข้อความแนบมากับไฟล์ (ไม่เกิน 1024 ตัวอักษร)
```

**Note**: The system will automatically use `TG_STRING_SESSION` from environment variables if available, falling back to the database-stored session if not.

#### Get All Files
```
GET /api/files
```

#### Get a Specific File
```
GET /api/files/:id
```

#### Verify File Integrity
```
GET /api/files/:id/verify
```

> หมายเหตุ: หากไฟล์ถูกลบออกจากโฟลเดอร์ `uploads/` แล้ว Endpoint นี้จะตอบกลับด้วย `"valid": null` และข้อความแจ้ง เพื่อยืนยันว่าไฟล์บนเครื่องถูกลบตามนโยบายความปลอดภัย

### Chat Management Endpoints

#### Set Chat Name
```
POST /api/chat-name
Content-Type: application/json

{
  "chat_id": "123456789",
  "chat_name": "My Group"
}
```

#### Get Chat Name
```
GET /api/chat-name/:chatId
```

#### Get All Chat Mappings
```
GET /api/chat-mappings
```

## Authentication

### Getting Your STRING_SESSION

To authenticate with Telegram, you need a STRING_SESSION. This can be obtained through various methods:

1. **Using a Telegram client library** (recommended for developers)
2. **Using the Telegram Desktop app** with developer tools
3. **Using online tools** (use with caution)

### Saving Your STRING_SESSION

Once you have your STRING_SESSION, you can save it in multiple ways:

#### Using the Dashboard Login Form

1. Access the dashboard at `http://0.0.0.0:8405`
2. Enter your:
   - Telegram STRING_SESSION
   - Telegram API ID
   - Telegram API Hash
3. Click "Save Session"
4. The system will test the connection and save the credentials to the database

#### Using cURL

```bash
curl -X POST http://0.0.0.0:8405/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"string_session": "your_string_session_here"}'
```

### Using TG_STRING_SESSION Environment Variable

The recommended approach is to set the `TG_STRING_SESSION` in your `.env` file:

1. Open your `.env` file
2. Update the `TG_STRING_SESSION` value with your actual STRING_SESSION
3. Restart the application

After setting the environment variable, you can initialize the Telegram connection:

```bash
curl -X POST http://0.0.0.0:8405/api/telegram/init
```

### Testing Authentication

After saving your STRING_SESSION, test the connection:

```bash
curl http://0.0.0.0:8405/api/auth/test
```

A successful response will look like:
```json
{
  "message": "Telegram connection successful",
  "connected": true
}
```

## File Management

### Uploading Files

Files can be uploaded through the dashboard or API. The system supports files up to 2GB in size.

#### Supported File Types

The system supports all file types. Telegram may have restrictions on certain file types in specific contexts.

#### Captions

You can optionally include a caption with each upload (maximum 1024 characters). Captions entered in the dashboard or sent via the API will be forwarded to Telegram together with the file.

#### Upload Progress

The system provides real-time upload progress tracking through:
- Visual progress bar in the dashboard
- Console logging on the server
- API response upon completion

#### Post-Upload Cleanup

- หลังอัปโหลดเสร็จสิ้น ระบบจะพยายามลบไฟล์ต้นฉบับออกจากโฟลเดอร์ `uploads/`  
- สถานะจะยังคงเป็น `uploaded` และข้อมูล `local_deleted`/`local_deleted_at` จะถูกบันทึกในฐานข้อมูล  
- หากการลบไฟล์ล้มเหลว (เช่น มี process อื่นเปิดใช้งาน) ระบบจะบันทึก error ลง log และยังคงเก็บไฟล์ไว้เพื่อความปลอดภัย

### File Integrity Verification

Each uploaded file is automatically hashed using SHA256 for integrity verification.

#### Verifying Files

To verify a file's integrity:

1. **Using the Dashboard**: Click the "Verify" button next to any file
2. **Using the API**: 
   ```bash
   curl http://0.0.0.0:8405/api/files/:id/verify
   ```

### File Status

Files can have the following statuses:
- **pending**: File is being processed
- **uploaded**: File has been successfully uploaded to Telegram
- **failed**: File upload failed

## Chat Management

### Chat ID Naming

To make chat identification easier, you can assign names to chat IDs.

#### Setting Chat Names

1. **Using the Dashboard**: Enter a chat name when uploading a file
2. **Using the API**:
   ```bash
   curl -X POST http://0.0.0.0:8405/api/chat-name \
     -H "Content-Type: application/json" \
     -d '{"chat_id": "123456789", "chat_name": "My Group"}'
   ```

#### Getting Chat Names

```bash
curl http://0.0.0.0:8405/api/chat-name/123456789
```

### Finding Chat IDs

To find chat IDs:

1. **For personal chats**: Use the Telegram user ID
2. **For groups**: 
   - Add the bot to the group
   - Send a message in the group
   - Check the bot's `getUpdates` endpoint
3. **For channels**: Use the channel's username or ID

## Troubleshooting

### Common Issues

#### Upload Fails with "No Telegram session found"

**Solution**: 
1. Ensure you have saved your STRING_SESSION in the database or set `TG_STRING_SESSION` in environment variables
2. Verify your Telegram API credentials are correct
3. Test the connection using `/api/auth/test`
4. If using environment variables, initialize the connection with `/api/telegram/init`
5. If using dashboard login, re-enter your credentials

#### File Upload Progress Stuck at 0%

**Solution**:
1. Check if the file size exceeds the configured limit
2. Verify the uploads directory has write permissions
3. Check server logs for errors

#### Database Connection Errors

**Solution**:
1. Ensure the database directory has write permissions
2. Check if the database file is locked by another process
3. Restart the server

### Checking Server Logs

Server logs are output to the console. For production environments, consider redirecting output to a log file:

```bash
npm start > server.log 2>&1
```

With PM2:
```bash
pm2 logs telegram-upload-file
```

### Getting Help

If you encounter issues not covered in this guide:

1. Check the server logs for error messages
2. Verify all configuration settings
3. Ensure your Telegram credentials are correct
4. Check the project's issue tracker

## Security Best Practices

### STRING_SESSION Security

- Store your STRING_SESSION securely
- Never commit it to version control
- Rotate sessions periodically
- Use environment variables or secure storage
- When using environment variables, ensure proper file permissions on `.env`
- When using dashboard login, be cautious on shared computers

### File Upload Security

- Validate file types on the server
- Limit file sizes appropriately
- Scan uploaded files for malware
- Implement rate limiting for uploads

### API Security

- Use HTTPS in production
- Implement authentication for API endpoints
- Validate all input data
- Log security-relevant events

### Database Security

- Store the database in a secure location
- Restrict database file permissions
- Backup the database regularly
- Use parameterized queries to prevent SQL injection

### Dashboard Security

- The login form uses password-type inputs to hide sensitive data
- Credentials are only stored in the database after successful validation
- API credentials are stored in localStorage for convenience (can be cleared by clearing browser data)

## Conclusion

The Telegram File Upload System provides a powerful and flexible solution for uploading files to Telegram. With its comprehensive dashboard and REST API, you can easily integrate file upload functionality into your applications.

For additional support, please refer to the project documentation or contact the development team.
