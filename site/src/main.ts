import "./styles/main.css";
import { ensureDemoData } from "./lib/demo";
import { initTheme } from "./lib/theme";
import { startApp } from "./ui/app";

initTheme();
ensureDemoData();

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  startApp(root);
}
