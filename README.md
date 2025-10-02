# BackEnd_ToDo
# 🛡️ Secure Todo Management System (Backend-Focused)

A robust, production-ready Todo application showcasing modern backend development, security protocols, and advanced cloud integration.

This project was developed to demonstrate expertise in building highly scalable, maintainable APIs using modern tools and DevOps practices.

## ✨ Key Features

* **Full CRUD Functionality:** Complete support for Create, Read, Update, and Delete tasks.
* **Secure Authentication:** Full **Registration, Login, and Logout** flow secured via **JWT (JSON Web Tokens)**.
* **AI-Driven Prioritization:** Integration with **Google Gemini API** to automatically set task priority (High/Medium/Low) based on content analysis.
* **Transactional Email Service:** Uses **Nodemailer** to send personalized task summaries to users.
* **Client-Side Optimization:** Utilizes browser **Caching** to optimize user experience after authentication.

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Runtime & Framework** | Node.js, Express.js |
| **Database & ORM** | **Prisma** (ORM), **PostgreSQL** (via Prisma Accelerate) |
| **Containerization** | **Docker** (Single Service Container) |
| **Security** | **JWT** (JSON Web Tokens) |
| **Front-end** | Vanilla HTML, CSS (Professional Design) |
| **Integrations** | **Google Gemini API**, Nodemailer |

## 🚀 Getting Started (Run with Docker)

This project is built for consistency. The easiest way to run it is using Docker, which handles all dependencies and environment setup.

### Prerequisites

1.  **Docker Desktop** installed and running.
2.  A **Prisma Accelerate `DATABASE_URL`** (PostgreSQL).
3.  A **Gmail App Password** and email user for Nodemailer.

### Setup

1.  **Clone the repository:**
    ```bash
    git clone [Your Repository URL]
    cd [your-project-folder]
    ```

2.  **Configure Environment:**
    Create a file named `.env` in the root directory and populate it with your secrets. Docker will load these automatically.

    ```env
    # .env
    DATABASE_URL="prisma+postgres://your_full_accelerate_url..." 
    JWT_SECRET="YOUR_HIGHLY_SECRET_KEY"
    EMAIL_USER="your-app-email@gmail.com"
    EMAIL_PASS="your_gmail_app_password"
    GEMINI_API_KEY="AI_API_KEY"
    ```

3.  **Run the Application:**
    Execute this command to build the image, create the container, run Prisma Generate, and start the server using the live-reloading `--watch` mode.

    ```bash
    # This command uses the single-service container and connects to your cloud DB.
    docker compose up --build --watch
    ```

### Access

The API and Front-end will be accessible at:http://localhost:3000

## 💡 Development Workflow

The project is configured for a modern development experience:

* **Live Reloading:** Thanks to the `docker compose up --watch` command, any changes made to `.js` files on your host machine will automatically trigger a server restart inside the container.
* **Prisma Commands:** To run migrations or generate the client manually, you can execute commands inside the running container:
    ```bash
    docker exec -it todo-app-node npx prisma migrate dev --name [migration_name]
    ```

---

## 👤 Author

* **Weaam Asad** -

## 🎥 Project Demo

Dive into the functionality and see the secure authentication, AI prioritization, and Docker setup in action!

[![Watch the Full Video Walkthrough]]([Your Full Video URL Here - e.g., YouTube Link])
