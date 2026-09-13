# Chat Tornado

## Run locally

Start FastAPI from `backend` with your database environment configured, then run `npm run dev` at the project root. The frontend API address is configurable with `VITE_API_URL`.

## Calls over the public internet

Voice and video calls use WebRTC and FastAPI only for authenticated signaling. For calls to work reliably across all networks, configure a production TURN server (for example coturn) and set the three `VITE_TURN_*` variables shown in `.env.example`. Production deployment also requires HTTPS/WSS; browsers restrict microphone/camera access on insecure public origins.

## Upload security

Uploads require a valid JWT, are capped at 25 MB, and accept images, video, audio, PDF, text, and ZIP files. Put uploads behind authenticated downloads before storing sensitive content in production.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
