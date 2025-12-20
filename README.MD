# MERN Stack Cloud-Based Task Manager Application

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://mern-stack-cloud-based-task-manager-xi.vercel.app)
[![JavaScript](https://img.shields.io/badge/JavaScript-98.2%25-yellow)](https://github.com/ar-pathak/MERN-Stack-Cloud-Based-Task-Manager-Application)
[![Stars](https://img.shields.io/github/stars/ar-pathak/MERN-Stack-Cloud-Based-Task-Manager-Application)](https://github.com/ar-pathak/MERN-Stack-Cloud-Based-Task-Manager-Application/stargazers)

A fully responsive, cloud-based task management application built with the MERN stack (MongoDB, Express.js, React.js, Node.js). This platform streamlines team task management with an intuitive interface for efficient task assignment, tracking, and collaboration.

🔗 **Live Demo:** [https://mern-stack-cloud-based-task-manager-xi.vercel.app](https://mern-stack-cloud-based-task-manager-xi.vercel.app)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## 🌟 Overview

In today's dynamic work environment, effective task management is essential for team success. This Cloud-Based Task Manager addresses the challenges of traditional task tracking methods by providing a centralized platform that enables seamless collaboration and improved workflow efficiency.

The application caters to both administrators and regular users, offering comprehensive features to enhance productivity and organization. With the rise of remote work and dispersed teams, this tool facilitates effective communication and task coordination across different time zones and locations.

---

## ✨ Features

### 👨‍💼 Admin Features
- **User Management**
  - Create and manage admin accounts
  - Add and manage team members
  - Disable or activate user accounts
  - Role-based access control

- **Task Management**
  - Create and assign tasks to individual or multiple users
  - Update task details and status
  - Set priority levels (high, medium, normal, low)
  - Add and manage sub-tasks
  - Upload task assets (images, documents)
  - Delete or trash tasks permanently

### 👤 User Features
- **Task Operations**
  - View assigned tasks with detailed information
  - Update task status (todo, in progress, completed)
  - Add comments and participate in task discussions
  - Track task progress and deadlines

- **Dashboard**
  - Personalized task dashboard
  - Filter and sort tasks by status, priority, and date
  - Real-time task updates
  - Activity timeline

### 🔐 Security Features
- Secure user authentication and authorization
- JWT-based session management
- Password encryption
- Protected API routes
- Role-based access control (RBAC)

### 📱 Responsive Design
- Fully responsive interface
- Mobile-friendly design
- Cross-browser compatibility
- Optimized for various screen sizes

---

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI library for building user interfaces
- **Redux Toolkit** - State management
- **Tailwind CSS** - Utility-first CSS framework
- **Headless UI** - Unstyled, accessible UI components
- **React Router** - Client-side routing

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Additional Tools
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Vercel** - Deployment platform

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git**
- A code editor (VS Code recommended)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ar-pathak/MERN-Stack-Cloud-Based-Task-Manager-Application.git
cd MERN-Stack-Cloud-Based-Task-Manager-Application
```

### 2. Install Server Dependencies

```bash
cd server
npm install
```

### 3. Install Client Dependencies

```bash
cd ../client
npm install
```

---

## 🔑 Environment Variables

### Server Configuration

Create a `.env` file in the `server` folder with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### MongoDB Setup

1. **Using MongoDB Atlas (Recommended)**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free account or log in
   - Create a new cluster
   - Click "Connect" and select "Connect your application"
   - Copy the connection string and replace `<password>` with your database password
   - Paste the connection string in your `.env` file as `MONGODB_URI`

2. **Using Local MongoDB**
   - Install MongoDB locally
   - Start MongoDB service
   - Use `MONGODB_URI=mongodb://localhost:27017/task-manager` in your `.env` file

---

## 💻 Running the Application

### Development Mode

#### Start the Server (Backend)

```bash
cd server
npm start
```

The server should start on `http://localhost:5000`

You should see messages like:
- "Server is running on port 5000"
- "Database Connected Successfully"

#### Start the Client (Frontend)

Open a new terminal window:

```bash
cd client
npm start
```

The client should start on `http://localhost:3000`

Your browser should automatically open to `http://localhost:3000`

### Production Build

#### Build the Client

```bash
cd client
npm run build
```

#### Start Production Server

```bash
cd server
npm run production
```

---

## 📁 Project Structure

```
MERN-Stack-Cloud-Based-Task-Manager-Application/
│
├── client/                  # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── redux/          # Redux store and slices
│   │   ├── utils/          # Utility functions
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                  # Express backend
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── config/             # Configuration files
│   ├── utils/              # Utility functions
│   ├── server.js           # Entry point
│   └── package.json
│
└── README.md
```

---

## 🔌 API Endpoints

### Authentication Routes
```
POST   /api/auth/register    - Register a new user
POST   /api/auth/login       - User login
POST   /api/auth/logout      - User logout
GET    /api/auth/profile     - Get user profile
```

### Task Routes
```
GET    /api/tasks            - Get all tasks
GET    /api/tasks/:id        - Get single task
POST   /api/tasks            - Create new task
PUT    /api/tasks/:id        - Update task
DELETE /api/tasks/:id        - Delete task
POST   /api/tasks/:id/status - Update task status
```

### User Routes (Admin Only)
```
GET    /api/users            - Get all users
GET    /api/users/:id        - Get single user
PUT    /api/users/:id        - Update user
DELETE /api/users/:id        - Delete user
PUT    /api/users/:id/status - Activate/Deactivate user
```

---

## 📸 Screenshots

*Add your application screenshots here*

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Guidelines
- Follow the existing code style
- Write clear commit messages
- Update documentation as needed
- Add tests for new features
- Ensure all tests pass before submitting PR

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Contact

**AR Pathak**

- GitHub: [@ar-pathak](https://github.com/ar-pathak)
- Project Link: [https://github.com/ar-pathak/MERN-Stack-Cloud-Based-Task-Manager-Application](https://github.com/ar-pathak/MERN-Stack-Cloud-Based-Task-Manager-Application)
- Live Demo: [https://mern-stack-cloud-based-task-manager-xi.vercel.app](https://mern-stack-cloud-based-task-manager-xi.vercel.app)

---

## 🙏 Acknowledgments

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)

---

## 📊 Project Status

This project is actively maintained and open for contributions. Feel free to report issues or suggest new features!

---

**⭐ If you find this project useful, please consider giving it a star!**