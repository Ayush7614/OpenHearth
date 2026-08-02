export type Route =
  | { name: "docs" }
  | { name: "workspaces" }
  | { name: "board" }
  | { name: "workspace"; id: string }
  | { name: "share"; payload: string }
  | { name: "portfolio"; payload: string }
  | { name: "gist"; id: string };

export function parseHash(hash = location.hash): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;

  if (path === "/" || path === "") return { name: "docs" };
  if (path === "/app" || path === "/app/") return { name: "workspaces" };
  if (path === "/app/board" || path === "/app/board/") return { name: "board" };

  const share = path.match(/^\/share\/([^/]+)\/?$/);
  if (share) return { name: "share", payload: decodeURIComponent(share[1]) };

  const portfolio = path.match(/^\/portfolio\/([^/]+)\/?$/);
  if (portfolio) return { name: "portfolio", payload: decodeURIComponent(portfolio[1]) };

  const gist = path.match(/^\/r\/([^/]+)\/?$/);
  if (gist) return { name: "gist", id: decodeURIComponent(gist[1]) };

  const m = path.match(/^\/app\/w\/([^/]+)\/?$/);
  if (m) return { name: "workspace", id: decodeURIComponent(m[1]) };

  return { name: "docs" };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case "docs":
      return "#/";
    case "workspaces":
      return "#/app";
    case "board":
      return "#/app/board";
    case "workspace":
      return `#/app/w/${encodeURIComponent(route.id)}`;
    case "share":
      return `#/share/${encodeURIComponent(route.payload)}`;
    case "portfolio":
      return `#/portfolio/${encodeURIComponent(route.payload)}`;
    case "gist":
      return `#/r/${encodeURIComponent(route.id)}`;
  }
}

export function navigate(route: Route): void {
  location.hash = hrefFor(route).replace(/^#/, "");
}

export function onRouteChange(handler: (route: Route) => void): () => void {
  const run = () => handler(parseHash());
  window.addEventListener("hashchange", run);
  return () => window.removeEventListener("hashchange", run);
}
