import "./styles/main.css";
import { initTheme } from "./lib/theme";
import { renderApp } from "./ui/app";

initTheme();

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  renderApp(root);
}
