# Agent Brutale

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/NicholaiVogel/v001-nextjs-agent)

Agent Brutale is a hyper-personalized AI coding assistant platform designed for web development, embracing a stark Brutalist aesthetic. It provides a seamless, integrated environment where developers can collaborate with a suite of specialized AI agents to build, modify, and deploy web applications using a Next.js, Tailwind CSS, and Shadcn/UI stack.

## Key Features

*   **Brutalist Aesthetic:** A raw, utilitarian, and visually striking user interface with sharp corners, bold typography, and a high-contrast color palette.
*   **Integrated Workspace:** A comprehensive three-panel layout featuring project management, an agent chat interface, and a real-time web IDE.
*   **BMAD Development Method:** An agile workflow (Blueprint, Model, Assemble, Deploy) that delegates tasks to specialized AI agents for efficient development.
*   **Multi-Model Framework:** Leverages different AI models for distinct tasks—large context models for planning and specialized coding models for implementation.
*   **GitHub Integration:** Connect your GitHub repositories to work on new (greenfield) or existing (brownfield) projects.
*   **MCP Connectors:** Agents utilize Model Context Protocol (MCP) servers for real-time, accurate information on frameworks, APIs, and best practices.
*   **Streamlined Deployment:** Built-in pipelines for easy deployment to Cloudflare Workers or self-hosted Docker containers.

## Technology Stack

*   **Frontend:** React, Vite, Tailwind CSS, Shadcn/UI, Framer Motion, Zustand
*   **Backend:** Cloudflare Workers, Hono, Cloudflare Agents SDK
*   **Language:** TypeScript
*   **Core AI:** OpenAI SDK, Model Context Protocol (MCP)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (v18 or later)
*   Bun

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/agent_brutale.git
    cd agent_brutale
    ```

2.  **Install dependencies:**
    ```sh
    bun install
    ```

3.  **Set up environment variables:**

    Create a `.dev.vars` file in the root of the project for local development. This file is used by Wrangler to load environment variables.

    ```ini
    # .dev.vars

    # Cloudflare AI Gateway URL
    # Example: https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/openai
    CF_AI_BASE_URL="your-cloudflare-ai-gateway-url"

    # Cloudflare AI Gateway API Key
    CF_AI_API_KEY="your-cloudflare-api-key"
    ```

    **Note:** The AI capabilities of this application will not function without valid Cloudflare AI Gateway credentials.

## Development

To start the development server, which includes the Vite frontend and the Cloudflare Worker backend, run:

```sh
bun dev
```

This command will:
*   Start the Vite development server for the frontend, typically on `http://localhost:3000`.
*   Start a local Wrangler server for the backend API.

The application will open in your default browser, and you can start making changes to the source code with hot-reloading enabled.

## Usage

Once the application is running, you can interact with the Agent Workspace:

1.  **Start a New Project:** Use the controls in the left sidebar to initiate a new coding session.
2.  **Interact with the Agent:** Type high-level instructions into the central chat panel (e.g., "Create a login form with email and password fields").
3.  **View Real-time Code:** As the agent works, generated code will appear and update in the right-hand IDE panel.
4.  **Collaborate:** You can directly edit the code in the IDE, and the agent will adapt to your changes in subsequent instructions.

## Deployment

This project is configured for seamless deployment to Cloudflare Workers.

### Deploying to Cloudflare

1.  **Login to Cloudflare:**
    If you haven't already, authenticate with your Cloudflare account:
    ```sh
    bunx wrangler login
    ```

2.  **Configure Environment Variables:**
    Before deploying, you must set the required secrets in your Cloudflare dashboard or via the command line:
    ```sh
    bunx wrangler secret put CF_AI_BASE_URL
    bunx wrangler secret put CF_AI_API_KEY
    ```

3.  **Deploy the application:**
    Run the deploy script to build the application and deploy it to your Cloudflare account.
    ```sh
    bun deploy
    ```

    This command will build the frontend assets and the worker, then publish them to Cloudflare.

Alternatively, deploy directly from your GitHub repository:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/NicholaiVogel/v001-nextjs-agent)

## Project Structure

*   `src/`: Contains all the frontend code, including React components, pages, hooks, and styles.
*   `worker/`: Contains the backend Cloudflare Worker code, including the Hono API routes, Agent logic, and tool integrations.
*   `wrangler.jsonc`: Configuration file for the Cloudflare Worker, including bindings and build settings.
*   `tailwind.config.js`: Configuration for Tailwind CSS.
*   `vite.config.ts`: Configuration for the Vite frontend build tool.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.