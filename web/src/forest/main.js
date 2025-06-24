import "./app.css";
import { Clock } from "./clock";

document.addEventListener("DOMContentLoaded", () => {
  const clock = new Clock();

  document.querySelector("#app").appendChild(clock.el);
});
