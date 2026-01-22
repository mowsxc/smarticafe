import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import "./style.css";
import { initSupabaseSync } from "./services/supabase/client";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize Supabase sync service for cloud backup and multi-device sync
initSupabaseSync().catch((error) => {
  console.error("Failed to initialize Supabase sync service:", error);
  // App continues to work offline even if sync fails
});

app.mount("#app");
