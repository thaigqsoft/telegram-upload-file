# Telegram File Upload System

A comprehensive file upload system that allows users to upload files to Telegram using the MTProto API. The system supports large file uploads, stores STRING_SESSION in SQLite3, provides a dashboard for monitoring uploads, and includes an API for external integrations.

## 🚀 Features

- **MTProto API Integration**: Secure file uploads to Telegram using the official MTProto protocol
- **Large File Support**: Handles files up to 2GB in size
- **Web Dashboard**: Beautiful pastel-themed UI for managing uploads with login authentication and logout support
- **REST API**: Complete programmatic access to all system features
- **File Integrity Verification**: SHA256 hashing for verification (หากไฟล์ถูกลบหลังอัปโหลด API จะส่งข้อความแจ้งแทน)
- **Progress Tracking**: Real-time upload progress monitoring (progress bar + doughnut chart, status `pending` แสดง progress bar แบบเคลื่อนไหวในตารางไฟล์)
- **Automatic Local Cleanup**: ลบไฟล์ต้นฉบับออกจากเครื่องเซิร์ฟเวอร์ทันทีหลังอัปโหลดสำเร็จ พร้อมเก็บ hash และ metadata ไว้ในฐานข้อมูล
- **Admin Login Protection**: เข้าสู่ระบบด้วย username/password จาก environment ก่อนใช้งานแดชบอร์ดและ REST API
- **Upload Token Security**: บังคับตรวจสอบค่า `TOKEN_UPLOAD` ในทุกคำขอ `POST /api/upload` เพื่อป้องกันการใช้งานโดยไม่ได้รับอนุญาต
- **Caption Support**: แนบข้อความ caption ไปกับไฟล์ (สูงสุด 1024 ตัวอักษร) ได้ทั้งจาก Dashboard และ REST API
- **Chat ID Naming**: Associate names with chat IDs and manage them directly from the dashboard (add/update/delete mapping form)
- **SQLite3 Storage**: Lightweight database for all system data
- **Environment-based Configuration**: Support for TG_STRING_SESSION environment variable
- **Filename Normalization**: รองรับชื่อไฟล์จาก CLI/Linux ที่มีอักขระพิเศษหรือภาษาอื่น ระบบจะแปลงเป็น UTF-8 และ sanitize อัตโนมัติ

## 🛠 Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Telegram API**: MTProto library
- **Frontend**: HTML/CSS/JavaScript with pastel-themed design
- **File Handling**: Multer for file uploads

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd telegram-upload-file

# Install dependencies
npm install

# Create required directories
mkdir -p uploads database

# Configure environment variables
cp .env.example .env
# Edit .env to add your Telegram API credentials and TG_STRING_SESSION
```

## ▶️ Usage

### Using PM2 (Recommended)

PM2 is a production process manager for Node.js applications with a built-in load balancer. It allows you to keep applications alive forever, to reload them without downtime and to facilitate common system admin tasks.

```bash
# Start the application with PM2
npm run pm2:start

# Check application status
npm run pm2:status

# View application logs
npm run pm2:logs

# Restart the application
npm run pm2:restart

# Stop the application
npm run pm2:stop

# Remove the application from PM2
npm run pm2:delete
```

Alternatively, you can use the provided shell script:
```bash
# Make the script executable (if not already)
chmod +x pm2-manager.sh

# Use the script
./pm2-manager.sh start
./pm2-manager.sh status
./pm2-manager.sh logs
./pm2-manager.sh restart
./pm2-manager.sh stop
```

### Direct Node.js

```bash
# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

Visit `http://0.0.0.0:8405` แล้วเข้าสู่ระบบด้วย credentials ที่ตั้งค่าไว้ใน environment ก่อนจะถูกพาไปยังแดชบอร์ดหลัก

## 🔧 Configuration

### Environment Variables

The application can be configured using environment variables. Copy `.env.example` to `.env` and update the values:

- `TELEGRAM_API_ID` - Your Telegram API ID (required)
- `TELEGRAM_API_HASH` - Your Telegram API Hash (required)
- `TG_STRING_SESSION` - Your Telegram STRING_SESSION (optional but recommended)
- `ADMIN_USERNAME` - Username สำหรับล็อกอินแดชบอร์ด
- `ADMIN_PASSWORD` - Password สำหรับล็อกอินแดชบอร์ด
- `SESSION_SECRET` - คีย์สำหรับเซ็น session (ควรเป็นค่าแบบสุ่มและเก็บเป็นความลับ)
- `TOKEN_UPLOAD` - Shared secret token required for uploading files (required)
- `HOST` - Host to bind to (default: 0.0.0.0)
- `PORT` - Port to listen on (default: 8405)
- `DATABASE_PATH` - Path to SQLite database file (default: ./database/app.db)

### Admin Login

1. กำหนดค่า `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET` ในไฟล์ `.env`
2. เปิดเบราว์เซอร์ไปที่ `http://HOST:PORT/login`
3. ล็อกอินสำเร็จแล้วระบบจะตั้ง session และพาไปยังแดชบอร์ดอัตโนมัติ
4. ปุ่ม `ออกจากระบบผู้ดูแล` มุมขวาบนจะทำการออกจากระบบและล้าง session ก่อนพากลับไปหน้า login

### Using TG_STRING_SESSION

You can configure the Telegram STRING_SESSION in two ways:

1. **Environment Variable (Recommended)**:
   Set the `TG_STRING_SESSION` in your `.env` file:
   ```
   TG_STRING_SESSION=your_string_session_here
   ```

2. **Dashboard Login Form**:
   When you first access the dashboard, you'll be prompted to enter your:
   - Telegram API ID
   - Telegram API Hash
   - Phone Number
   
   You'll receive a verification code in Telegram. Enter the code to complete the login and store the STRING_SESSION automatically in SQLite3.

3. **Database Storage via API**:
   Use the API to save your STRING_SESSION to the database:
   ```bash
   curl -X POST http://0.0.0.0:8405/api/auth/session \
     -H "Content-Type: application/json" \
     -d '{"string_session": "your_string_session_here"}'
   ```

### Initializing Telegram Connection

If you've added the `TG_STRING_SESSION` to your environment variables, you can initialize the Telegram connection:

```bash
curl -X POST http://0.0.0.0:8405/api/telegram/init
```

## 📖 Documentation

- [User Guide](USER_GUIDE.md) - Complete instructions for using the system
- [API Documentation](API_DOCS.md) - Detailed API reference with examples
- [Project Summary](PROJECT_SUMMARY.md) - Technical overview of the implementation

## 🧪 Testing

```bash
# Run comprehensive system tests
node comprehensive-test.js
```

## 🎨 Dashboard Preview

The web dashboard features a beautiful pastel-themed interface with a login form:

![Dashboard Login Preview](docs/dashboard-login-preview.png)
![Dashboard Main Preview](docs/dashboard-main-preview.png)

*Note: Dashboard preview images not included in this repository.*

## 🔧 API Endpoints

> หมายเหตุ: เกือบทุก endpoint ต้องมี session จากการล็อกอิน `/login` ยกเว้น `POST /api/upload` ที่ตรวจสอบเฉพาะ `TOKEN_UPLOAD`

- `POST /api/upload` - Upload a file to Telegram (fields: `file`, `chat_id`, `token_upload`, optional `chat_name`, optional `message_thread_id`, optional `caption`) — response ระบุสถานะ `local_deleted` เพื่อยืนยันว่าไฟล์บนเซิร์ฟเวอร์ถูกลบแล้ว
- `GET /api/files` - Get all uploaded files
- `GET /api/files/:id` - Get a specific file
- `POST /api/chat-name` - Set a name for a chat ID
- `GET /api/chat-name/:chatId` - Get the name for a chat ID
- `POST /api/telegram/init` - Initialize Telegram connection from environment variables
- `POST /api/auth/session` - Save STRING_SESSION to database
- `GET /api/auth/session` - Get STRING_SESSION from database or environment
- `DELETE /api/auth/session` - Clear STRING_SESSION from database
- `GET /api/auth/test` - Test Telegram connection
- `POST /api/auth/logout` - ล้าง STRING_SESSION และ logout
- `DELETE /api/files/:id` - Delete an uploaded file and update dashboard charts

See [API Documentation](API_DOCS.md) for complete details.

## 🔐 Security

- STRING_SESSION stored securely in database or environment variables
- Environment-based configuration for API credentials
- Input validation on all endpoints
- File integrity verification with SHA256 hashes
- Login form for dashboard authentication

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## 📞 Support

For support, please open an issue on the project repository or contact the development team.
