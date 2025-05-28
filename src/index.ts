import { createDjango } from "./django";
import type { DjangoConfig } from "./types";

(() => {
	const currentScript = document.currentScript as HTMLScriptElement | null;
	if (!currentScript) return;

	const config: DjangoConfig = {
		packages: currentScript.dataset.packages
			? currentScript.dataset.packages
					.split(",")
					.map((p) => p.trim())
					.filter(Boolean)
			: [],
		autoInit: currentScript.dataset.autoInit !== "false",
	};

	const django = createDjango(config);

	(window as any).Django = django;
	(globalThis as any).Django = django;

	if (config.autoInit) {
		const initWhenReady = () => {
			django.init().catch((error) => {
				console.error("Django initialization failed:", error);
			});
		};

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", initWhenReady);
		} else {
			setTimeout(initWhenReady, 0);
		}
	}
})();
