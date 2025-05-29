export const WORKER_MESSAGE_TYPES = {
	INIT: "init",
	RENDER_TEMPLATE: "renderTemplate",
	RUN_PYTHON: "runPython",
	INSTALL_PACKAGE: "installPackage",
} as const;

export const EVENT_TYPES = {
	LOADING: "loading",
	READY: "ready",
	ERROR: "error",
} as const;

export const LOADING_STEPS = {
	PYODIDE: "pyodide",
	PACKAGES: "packages",
	DJANGO: "django",
	FILESYSTEM: "filesystem",
	READY: "ready",
} as const;

export const FILE_EXTENSIONS = {
	HTML: ".html",
	JS: ".js",
	WORKER_JS: "pyodide.worker.js",
	INDEX_JS: "index.js",
} as const;

// Type utilities
export type WorkerMessageType =
	(typeof WORKER_MESSAGE_TYPES)[keyof typeof WORKER_MESSAGE_TYPES];
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
export type LoadingStep = (typeof LOADING_STEPS)[keyof typeof LOADING_STEPS];

export interface LoadingEvent {
	step: LoadingStep;
	message: string;
}

export interface ReadyEvent {
	message: string;
}

export interface ErrorEvent {
	error: Error;
	message: string;
}

export interface TemplateRenderResult {
	success: boolean;
	result: string | null;
	error: string | null;
	traceback?: string;
}
