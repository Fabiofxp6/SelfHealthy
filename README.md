# SelfHealthy

SelfHealthy is an Express + EJS web application focused on emotional wellness. It includes user registration and login, session-based authentication, MongoDB persistence, and a protected AI chat experience powered by OpenAI through LangChain.

## Stack

- Node.js
- Express
- EJS
- MongoDB with Mongoose
- `express-session`
- `bcryptjs`
- LangChain + OpenAI

## Features

- Public landing page
- User sign up and login
- Password hashing with bcrypt
- Session-based authentication
- Protected dashboard at `/pagina_principal`
- AI chat endpoint at `/api/chat`
- Health check endpoint at `/__health`

## Project Structure

```text
.
├── api/                # Serverless entry kept from the previous deployment setup
├── css/                # Stylesheets
├── imgs/               # Static images
├── javascript/         # Express server and browser scripts
├── views/              # EJS templates and partials
├── package.json
└── requirements.txt    # Legacy Python dependencies, not required for the Node app runtime
```

## Requirements

- Node.js 18+ recommended
- npm
- A MongoDB database
- An OpenAI API key

## Environment Variables

Create a local `.env` file with:

```env
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=replace_with_a_long_random_secret
PORT=3000
NODE_ENV=development
```

Notes:

- `MONGODB_URI` is required for app startup.
- `OPENAI_API_KEY` is required for the chat endpoint.
- `SESSION_SECRET` should be a strong random value in production.
- `PORT` is optional locally and defaults to `3000`.

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

The server will be available at:

```text
http://localhost:3000
```

## Main Routes

- `GET /` - landing page
- `GET /cadastro` - registration page
- `POST /enviar` - create account
- `GET /login` - login page
- `POST /login` - authenticate user
- `GET /pagina_principal` - protected page
- `GET /logout` - end session
- `POST /api/chat` - protected AI chat endpoint
- `GET /__health` - health check

## Production Deployment on a DigitalOcean Droplet

This project is now intended to run on a DigitalOcean Droplet instead of Vercel.

### 1. Prepare the Droplet

Install the base packages:

```bash
sudo apt update
sudo apt install -y nginx
```

Install Node.js 20 and PM2:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Copy the Project

Clone the repository onto the Droplet and enter the project folder:

```bash
git clone <your-repository-url>
cd site2
```

Install production dependencies:

```bash
npm install --omit=dev
```

### 3. Configure Environment Variables

Create the production `.env` file:

```bash
nano .env
```

Use production values for:

```env
MONGODB_URI=your_production_mongodb_uri
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=use_a_long_random_secret
PORT=3000
NODE_ENV=production
```

### 4. Run the App with PM2

Start the server:

```bash
pm2 start javascript/local.js --name selfhealthy
```

Persist the PM2 process across reboots:

```bash
pm2 save
pm2 startup
```

### 5. Configure Nginx as a Reverse Proxy

Create an Nginx site file:

```bash
sudo nano /etc/nginx/sites-available/selfhealthy
```

Example configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/selfhealthy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Optional: Enable HTTPS

If your domain already points to the Droplet, install Certbot and issue a certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Operational Notes

- The app uses in-memory session storage through `express-session`. For a higher-traffic or multi-instance production setup, replace it with a persistent session store.
- Chat history is also stored in memory per logged-in session and is lost when the process restarts.
- The `/__health` endpoint can be used for uptime checks and reverse-proxy health probes.
- The `api/index.js` file remains in the repository, but it is not required when running the app directly on a Droplet.

## Security Notes

- Never commit real secrets to the repository.
- Rotate any exposed API keys or database credentials immediately if they were ever stored in versioned files.
- Use a long random `SESSION_SECRET` in production.

## License

This project currently has no license file defined in the repository.
