window.log = (m) => (v) => {
  console.log(m, v);
  return v;
};

const secureImg = (url) =>
  url.match(/(https)./) ? url : url.replace("http:", "https:");

export const randomPause = () => Math.random() * 1000;
export const Pause = (n) => () => n * 1000;
export const NoOp = () => {};
export const nameFromRoute = (route) => route.split("/")[1].toUpperCase();

export const jsonCopy = (data) => JSON.parse(JSON.stringify(data));

export const isSideBarActive = (mdl) =>
  mdl.settings.displayType !== "desktop" && mdl.status.sidebar;

export const range = (size) => [...Array(size).keys()];

export const scrollToTop = (dom) => {
  const c = dom.scrollTop || dom.scrollTop;
  console.log(c);
  if (c > 0) {
    window.requestAnimationFrame(scrollToTop);
    window.scrollTo(0, c - c / 8);
  }
};
