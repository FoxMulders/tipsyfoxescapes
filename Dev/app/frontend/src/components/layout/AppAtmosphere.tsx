const APP_PUBLIC_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "/");
/** Global backdrop: couple on a ridge above an endless maze (`public/planning-maze-backdrop.png`). */
export const APP_GLOBAL_BACKDROP_URL = `${APP_PUBLIC_BASE}planning-maze-backdrop.png`;

export function AppAtmosphere() {
  return (
    <div className="app-atmosphere" data-backdrop="art" aria-hidden="true">
      <div className="app-atmosphere__image-layer">
        <img
          className="app-atmosphere__img app-atmosphere__img--base"
          src={APP_GLOBAL_BACKDROP_URL}
          alt=""
          decoding="async"
        />
      </div>
      <div className="app-atmosphere__veil" />
    </div>
  );
}
