import { createApp } from "./app";
void createApp()
  .then((app) => app.listen(Number(process.env.PORT ?? 3100), process.env.API_HOST || "127.0.0.1"))
  .catch(() => {
    console.error(
      "InfiMatch startup failed; verify configuration and dependencies.",
    );
    process.exitCode = 1;
  });
