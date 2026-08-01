export type Route =
  | { name: "docs" }
  | { name: "workspaces" }
  | { name: "workspace"; id: string };

export function parseHash(hash = location.hash): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;

  if (path === "/" || path === "") return { name: "docs" };
  if (path === "/app" || path === "/app/") return { name: "workspaces" };

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
    case "workspace":
      return `#/app/w/${encodeURIComponent(route.id)}`;
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
