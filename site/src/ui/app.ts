import { parseHash, onRouteChange, type Route } from "../lib/router";
import { renderBoard } from "./board";
import { renderGistView, renderPortfolioView, renderShareView } from "./share";
import { renderSite } from "./site";
import { renderWorkspaceHome } from "./workspace-home";
import { renderWorkspaceView } from "./workspace-view";

export function startApp(root: HTMLElement): void {
  const render = (route: Route) => {
    switch (route.name) {
      case "docs":
        renderSite(root);
        break;
      case "workspaces":
        renderWorkspaceHome(root);
        break;
      case "board":
        renderBoard(root);
        break;
      case "workspace":
        renderWorkspaceView(root, route.id);
        break;
      case "share":
        renderShareView(root, route.payload);
        break;
      case "portfolio":
        renderPortfolioView(root, route.payload);
        break;
      case "gist":
        renderGistView(root, route.id);
        break;
    }
  };

  onRouteChange(render);
  render(parseHash());
}
