# Board Camera

## Starting
### Configuration
#### Environment variables
You can specify env variables in a `.env` file placed in the repo root
```dotenv
STORAGE_LOCATION= # path to mount volume location
BACKEND_PORT=5000
BASE_URL=http://localhost:5000 # used for Google login redirect
```
#### Additional files
##### `google-keys.json` - Google OAuth2.0 Client ID
Create your own at https://console.cloud.google.com/apis/credentials.
Pick the **Web Application** type and specify `BASE_URL/auth/google-callback` as a redirect URI (using the `BASE_URL` from above)

##### `session-key` - secret for [fastify-secure-session](https://github.com/fastify/fastify-secure-session)
You can generate one using this command:
```shell
./backend/node_modules/.bin/secure-session-gen-key > session-key
```
Please see this if you are using windows: https://github.com/fastify/fastify-secure-session/issues/87

### Running
```shell
docker compose up -f ./docker-compose.yml -f ./docker-compose.development.yml -d
```

## Docs
The API is documented using Swagger. Open /api/docs in your browser (after starting) to see the docs.
