## About

This is the source code for Approach Zero [search page](https://approach0.xyz/search) front-end written in Vue 3 and integrated relay backend, powered by Bun and Vite.

### Development Setup
```sh
$ bun install
$ bun run dev
```
Both the Vue 3 frontend and the relay backend run together on `http://localhost:19985`.

### Testing
Run unit tests for relay parsing and endpoint logic:
```sh
$ bun test
```

### Deployment Setup
Configure backend daemon targets in `.env` (optional defaults are `localhost`):
```env
A0_SEARCHD=localhost
A0_SEARCHD_PORT=8921
A0_QRYLOGD=localhost
A0_QRYLOGD_PORT=3207
```

Build and run the production server:
```sh
$ bun run build
$ bun run serve
```
Lệnh `bun run serve` sẽ tự động khởi động **cả hai server cùng lúc**:
- **Cổng 19985**: Giao diện Web (Frontend UI) + API relay nội bộ
- **Cổng 8080**: API relay backend độc lập (Search Relay & Click Relay)

### Docker Setup
```sh
$ docker build -t ui-approach0 .
$ docker run -p 19985:19985 -p 8080:8080 ui-approach0
```
