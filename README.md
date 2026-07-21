# Task Manager - Full Stack on AWS EC2

A simple task management application built with **React** and **Node.js**, deployed on **AWS EC2** with **CI/CD** via GitHub Actions.

## Architecture

- **Frontend:** React (Vite) → served by nginx on port 80
- **Backend:** Node.js + Express → runs on port 4000 as a systemd service
- **Reverse Proxy:** nginx routes `/api/*` to the backend
- **CI/CD:** GitHub Actions → auto-deploys on push to `main`

## Features

- Create, complete, and delete tasks
- Server health indicator
- Progress tracking
- Automatic deployment on code push
