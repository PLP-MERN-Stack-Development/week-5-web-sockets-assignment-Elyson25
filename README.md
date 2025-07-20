# Real-Time Chat Application

## Project Overview

This is a full-featured, real-time chat application built with React, Node.js, Express, and powered by Socket.io. The application provides a seamless, interactive chatting experience, allowing users to communicate in public rooms and through private one-on-one messages. The project is designed to be responsive, offering a great user experience on both desktop and mobile devices.

---

## Features Implemented

### Core Functionality

* **User Authentication:** Simple and effective username-based login system.
* **Multiple Chat Rooms:** Pre-defined public channels (e.g., #General, #Technology) that users can join.
* **Private Messaging:** Ability to click on any online user to start a secure, one-to-one conversation.
* **Real-Time Messaging:** Instantaneous message delivery using Socket.io.
* **Online/Offline Status:** A sidebar shows a list of all globally online users. The user list within each room is also updated in real-time.

### Advanced Features

* **"User is Typing" Indicator:** Provides real-time feedback when a user in the current chat is composing a message.
* **Browser & Sound Notifications:** Utilizes the Web Notifications API and sound effects to alert users of new messages when the application is in a background tab.
* **Unread Message Counts:** Displays a notification badge with the number of unread messages for inactive chats.
* **System Messages:** In-chat notifications announce when a user joins or leaves a room.
* **Responsive Design:** The UI is fully responsive, adapting from a multi-pane desktop layout to a mobile-friendly, single-view layout with a toggleable sidebar.

---

## Setup and Installation

To run this project locally, please follow the steps below:

### Prerequisites

* Node.js (v18+ recommended)
* npm (Node Package Manager)

### Installation

1. **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2. **Install server dependencies:**

    ```bash
    cd server
    npm install
    ```

3. **Install client dependencies:**

    ```bash
    cd ../client
    npm install
    ```

### Running the Application

You will need two separate terminals to run both the client and server development servers.

1. **Start the server:**
    * In the `/server` directory, run:

    ```bash
    npm run dev
    ```

    The server will be running on `http://localhost:3001`.

2. **Start the client:**
    * In the `/client` directory, run:

    ```bash
    npm start
    ```

    The application will open in your browser at `http://localhost:3000`.
