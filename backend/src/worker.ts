import { NotificationsService } from "./notifications/notifications.module";
import { createApp } from "./app";
import { AutomationService } from "./automation/automation.module";
async function run() {
  const app = await createApp();
  const automation = app.get(AutomationService);
  const notifications = app.get(NotificationsService);
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    while (!stopping) {
      const result = await automation.dispatch();
      await notifications.dispatch();
      if (result.length) console.log(JSON.stringify({ outbox: result }));
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } finally {
    await app.close();
  }
}
void run().catch(() => {
  console.error("Outbox worker failed; inspect dependencies and configuration");
  process.exitCode = 1;
});
