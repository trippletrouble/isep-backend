import 'dotenv/config';

const testDefaults = {
  POSTGRES_URL: 'postgres://myuser:***@localhost:5432/isep_db',
  POSTGRES_USER: 'myuser',
  POSTGRES_PASSWORD: ***ENTFERNT***
  POSTGRES_DB: 'isep_db',
  POSTGRES_PORT: '5432',
  BACKEND_PORT: '3000',
  KEYCLOAK_URL: 'http://localhost:8080',
  KEYCLOAK_REALM: 'ludo',
  KEYCLOAK_CLIENT_ID: 'ludo-app',
  KEYCLOAK_CLIENT_SECRET: ***ENTFERNT***
  KEYCLOAK_CALLBACK_URL: 'http://localhost:3000/auth/oauth/callback',
  SESSION_SECRET: ***ENTFERNT***
  NODE_ENV: 'test',
};

for (const [key, value] of Object.entries(testDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
