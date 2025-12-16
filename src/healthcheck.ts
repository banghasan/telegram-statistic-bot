import config from "./config";

async function check() {
  const port = config.server.port || 3000;
  const url = `http://127.0.0.1:${port}/health`;

  try {
    const response = await fetch(url);
    if (response.status === 200) {
      process.exit(0);
    } else {
      console.error(`Health check failed with status: ${response.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Health check failed:", error);
    process.exit(1);
  }
}

check();
