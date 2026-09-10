## About

This is the source code for Approach Zero [search page](https://approach0.xyz/search) front-end written in Vue 3, powered by Bun and Vite.

### Development Setup
```sh
$ bun install
$ bun run dev
```
View the webpage at `http://localhost:19985`.

### Deployment Setup
Set environment variable `A0_RELAY_URL` in `.env` (e.g. `http://localhost:8080` or `http://<IP>:8080` where your backend is running) and issue:
```sh
$ bun run build
$ bun run serve
```

### Docker Setup
```sh
$ docker build -t ui-approach0 .
$ docker run -p 19985:19985 ui-approach0
```
