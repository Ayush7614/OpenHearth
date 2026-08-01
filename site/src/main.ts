import "./styles/main.css";
import { initTheme } from "./lib/theme";
import { startApp } from "./ui/app";

initTheme();

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  startApp(root);
}
