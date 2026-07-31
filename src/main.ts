import "./styles/main.css";
import { renderApp } from "./ui/app";

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  renderApp(root);
}
