import * as process from 'node:process';
import { MissingEnvError } from './missing-env-error.config';

export const appConfig = {
  postgres_url: validateEnv('POSTGRES_URL'),

  node_env: validateEnv('NODE_ENV'),
  backend_port: validateEnv('PORT'),
  frontend_url: validateEnv('FRONTEND_URL'),

  jwt_secret: ***ENTFERNT***
  jwt_expiration: validateEnv('JWT_EXPIRATION'),

  keycloak_url: validateEnv('KEYCLOAK_URL'),
  keycloak_realm: validateEnv('KEYCLOAK_REALM'),
  keycloak_client_id: validateEnv('KEYCLOAK_CLIENT_ID'),
  keycloak_client_secret: ***ENTFERNT***
  keycloak_callback_url: validateEnv('KEYCLOAK_CALLBACK_URL'),
};

function validateEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new MissingEnvError(`Missing required env variable: ${key}`);
  }
  return value;
}
