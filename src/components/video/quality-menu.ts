import type MenuButtonType from "video.js/dist/types/menu/menu-button";
import type MenuItemType from "video.js/dist/types/menu/menu-item";
import type Player from "video.js/dist/types/player";

type Vjs = typeof import("video.js").default;

interface QualityLevel {
  height?: number;
  enabled: boolean;
}
interface QualityLevelList {
  length: number;
  readonly [index: number]: QualityLevel;
  selectedIndex: number; // index of the level currently being played (ABR or pinned)
  on(type: string, listener: () => void): void;
}
type PlayerWithQL = Player & { qualityLevels?: () => QualityLevelList };

/**
 * Adds an HLS resolution selector (Auto / 1080p / 720p / …) to the control bar, driven by
 * videojs-contrib-quality-levels (bundled with VHS). No-op if quality levels are unavailable.
 */
export function setupQualityMenu(vjs: Vjs, player: Player): void {
  const p = player as PlayerWithQL;
  if (typeof p.qualityLevels !== "function") return;
  const levels = p.qualityLevels();

  const MenuButton = vjs.getComponent("MenuButton") as unknown as typeof MenuButtonType;
  const MenuItem = vjs.getComponent("MenuItem") as unknown as typeof MenuItemType;

  let selectedHeight = -1; // -1 = Auto (ABR)
  const ref: { button?: QualityMenuButton } = {};

  const heights = (): number[] =>
    Array.from(
      new Set(
        Array.from({ length: levels.length }, (_, i) => levels[i].height).filter(
          (h): h is number => typeof h === "number" && h > 0,
        ),
      ),
    ).sort((a, b) => b - a);

  const applyHeight = (h: number) => {
    selectedHeight = h;
    for (let i = 0; i < levels.length; i++) {
      levels[i].enabled = h === -1 || levels[i].height === h;
    }
  };

  // Label shown on the control-bar button: the resolution currently playing (or "Auto").
  const currentLabel = (): string => {
    if (selectedHeight !== -1) return `${selectedHeight}p`;
    const i = levels.selectedIndex;
    const h = i >= 0 && i < levels.length ? levels[i].height : undefined;
    return h ? `${h}p` : "Auto";
  };

  class QualityItem extends MenuItem {
    readonly levelHeight: number;
    constructor(label: string, height: number) {
      super(player, { label, selectable: true, selected: selectedHeight === height });
      this.levelHeight = height;
    }
    handleClick() {
      applyHeight(this.levelHeight);
      ref.button?.update();
    }
  }

  class QualityMenuButton extends MenuButton {
    private labelEl: HTMLElement | undefined;
    constructor() {
      super(player, {});
      this.addClass("vjs-quality-menu");
      this.controlText("Качество");
      this.labelEl = document.createElement("span");
      this.labelEl.className = "vjs-quality-label";
      this.el().appendChild(this.labelEl);
      this.updateLabel();
    }
    createItems() {
      const items: MenuItemType[] = [new QualityItem("Auto", -1)];
      for (const h of heights()) items.push(new QualityItem(`${h}p`, h));
      return items;
    }
    updateLabel() {
      if (this.labelEl) this.labelEl.textContent = currentLabel();
    }
    update() {
      super.update();
      this.updateLabel();
    }
    buildCSSClass() {
      return `vjs-quality-menu ${super.buildCSSClass()}`;
    }
  }

  ref.button = new QualityMenuButton();

  const controlBar = player.getChild("controlBar");
  if (!controlBar) return;
  const fsToggle = controlBar.getChild("fullscreenToggle");
  const index = fsToggle ? controlBar.children().indexOf(fsToggle) : undefined;
  controlBar.addChild(ref.button, {}, index);

  // Levels populate after the manifest loads; rebuild the menu as they arrive.
  levels.on("addqualitylevel", () => ref.button?.update());
  levels.on("removequalitylevel", () => ref.button?.update());
  // ABR switched the active rendition → only refresh the displayed resolution.
  levels.on("change", () => ref.button?.updateLabel());
  ref.button.update();
}
