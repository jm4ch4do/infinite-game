import "./style.css";
import { mountMenu } from "./menu/menu";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app container not found");
}

mountMenu(app);
