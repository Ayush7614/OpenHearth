import "./styles/main.css";
import { initTheme } from "./lib/theme";
import { renderSite } from "./ui/site";

initTheme();

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  renderSite(root);
}
