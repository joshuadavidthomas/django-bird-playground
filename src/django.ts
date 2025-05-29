import type {
	ErrorEvent,
	EventType,
	LoadingEvent,
	ReadyEvent,
	WorkerMessageType,
} from "./types";

import { EVENT_TYPES, FILE_EXTENSIONS, WORKER_MESSAGE_TYPES } from "./types";
import type { WorkerMessage, WorkerResponse } from "./worker/pyodide.worker";

interface DjangoConfig {
	packages?: string[];
	autoInit?: boolean;
}

interface DjangoState {
	config: Required<DjangoConfig>;
	worker: Worker | null;
	ready: boolean;
	loading: boolean;
	error: Error | null;
	eventTarget: EventTarget;
	messageId: number;
	pendingMessages: Map<
		number,
		{
			resolve: (value: any) => void;
			reject: (error: Error) => void;
		}
	>;
}

const createInitialState = (config: DjangoConfig = {}): DjangoState => ({
	config: {
		packages: [],
		autoInit: true,
		...config,
	},
	worker: null,
	ready: false,
	loading: false,
	error: null,
	eventTarget: new EventTarget(),
	messageId: 0,
	pendingMessages: new Map(),
});

const createWorkerUrl = (): string => {
	// For ES modules, we can't detect script src, so use relative path
	// Assume worker is in same directory as the main module
	const currentPath = new URL(import.meta.url).pathname;
	const basePath = currentPath.substring(0, currentPath.lastIndexOf("/") + 1);
	return basePath + FILE_EXTENSIONS.WORKER_JS;
};

const setupWorkerListeners = (state: DjangoState, worker: Worker): void => {
	worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
		const { id, result, error, progress, ready } = event.data;

		if (progress) {
			emitEvent(state, EVENT_TYPES.LOADING, {
				step: progress.step as any,
				message: progress.message,
			});
			return;
		}

		if (ready) {
			state.ready = true;
			state.loading = false;
			emitEvent(state, EVENT_TYPES.READY, { message: "Django ready!" });
			return;
		}

		if (id !== undefined && state.pendingMessages.has(id)) {
			const { resolve, reject } = state.pendingMessages.get(id)!;
			state.pendingMessages.delete(id);

			if (error) {
				reject(new Error(error));
			} else {
				resolve(result);
			}
		}
	};

	worker.onerror = (error) => {
		state.error = new Error(`Worker error: ${error.message}`);
		state.loading = false;
		emitEvent(state, EVENT_TYPES.ERROR, {
			error: state.error,
			message: state.error.message,
		});
	};
};

const emitEvent = (
	state: DjangoState,
	eventType: EventType,
	detail: LoadingEvent | ReadyEvent | ErrorEvent,
): void => {
	const event = new CustomEvent(eventType, { detail });
	state.eventTarget.dispatchEvent(event);
	window.dispatchEvent(new CustomEvent(`django:${eventType}`, { detail }));
};

const sendMessage = async (
	state: DjangoState,
	type: WorkerMessageType,
	data?: any,
): Promise<any> => {
	if (!state.worker) {
		throw new Error("Worker not initialized");
	}

	if (!state.ready) {
		throw new Error(
			"Django not ready. Call init() first or wait for ready event.",
		);
	}

	const id = ++state.messageId;

	return new Promise((resolve, reject) => {
		state.pendingMessages.set(id, { resolve, reject });

		state.worker!.postMessage({ id, type, data } as WorkerMessage);

		setTimeout(() => {
			if (state.pendingMessages.has(id)) {
				state.pendingMessages.delete(id);
				reject(new Error(`Worker message timeout: ${type}`));
			}
		}, 30000);
	});
};

const initializeDjango = async (state: DjangoState): Promise<void> => {
	if (state.loading || state.ready) {
		return;
	}

	state.loading = true;
	state.error = null;

	try {
		const worker = new Worker(createWorkerUrl());
		setupWorkerListeners(state, worker);
		state.worker = worker;
	} catch (error) {
		state.error = error as Error;
		state.loading = false;
		emitEvent(state, EVENT_TYPES.ERROR, {
			error: state.error,
			message: state.error.message,
		});
		throw error;
	}
};

const renderTemplate = async (
	state: DjangoState,
	templateString: string,
	context: Record<string, any> = {},
): Promise<string> => {
	try {
		const result = await sendMessage(
			state,
			WORKER_MESSAGE_TYPES.RENDER_TEMPLATE,
			{
				template: templateString,
				context,
			},
		);

		if (result.get("success")) {
			return result.get("result");
		} else {
			throw new Error(result.get("error"));
		}
	} catch (error) {
		throw new Error(`Template rendering failed: ${(error as Error).message}`);
	}
};

const runPython = async (
	state: DjangoState,
	code: string,
	data?: Record<string, any>,
): Promise<any> => {
	return sendMessage(state, WORKER_MESSAGE_TYPES.RUN_PYTHON, { code, data });
};

const installPackage = async (
	state: DjangoState,
	packageName: string,
): Promise<void> => {
	const result = await sendMessage(
		state,
		WORKER_MESSAGE_TYPES.INSTALL_PACKAGE,
		{
			packageName,
		},
	);
	if (!result.success) {
		throw new Error(`Failed to install package: ${packageName}`);
	}
};

const saveTemplate = async (
	state: DjangoState,
	name: string,
	content: string,
): Promise<void> => {
	const result = await runPython(
		state,
		`save_template('${name}', '''${content}''')`,
	);
	if (!result.success) {
		throw new Error(result.error);
	}
};

const loadTemplate = async (
	state: DjangoState,
	name: string,
): Promise<string> => {
	const result = await runPython(state, `load_template('${name}')`);
	if (!result.success) {
		throw new Error(result.error);
	}
	return result.content;
};

const listTemplates = async (state: DjangoState): Promise<string[]> => {
	const result = await runPython(state, `list_templates()`);
	if (!result.success) {
		throw new Error(result.error);
	}
	return result.templates;
};

const destroyDjango = (state: DjangoState): void => {
	if (state.worker) {
		state.worker.terminate();
		state.worker = null;
	}
	state.pendingMessages.clear();
	state.ready = false;
	state.loading = false;
};

const addEventListener = (
	state: DjangoState,
	type: string,
	listener: EventListener,
	options?: AddEventListenerOptions,
): void => {
	state.eventTarget.addEventListener(type, listener, options);
};

const removeEventListener = (
	state: DjangoState,
	type: string,
	listener: EventListener,
	options?: EventListenerOptions,
): void => {
	state.eventTarget.removeEventListener(type, listener, options);
};

interface DjangoInstance {
	init(): Promise<void>;
	renderTemplate(
		templateString: string,
		context?: Record<string, any>,
	): Promise<string>;
	runPython(code: string, data?: Record<string, any>): Promise<any>;
	installPackage(packageName: string): Promise<void>;
	saveTemplate(name: string, content: string): Promise<void>;
	loadTemplate(name: string): Promise<string>;
	listTemplates(): Promise<string[]>;
	isReady(): boolean;
	getPackages(): string[];
	addEventListener(
		type: string,
		listener: EventListener,
		options?: AddEventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListener,
		options?: EventListenerOptions,
	): void;
	destroy(): void;
}

const createDjango = (config?: DjangoConfig): DjangoInstance => {
	const state = createInitialState(config);

	return {
		init: () => initializeDjango(state),
		renderTemplate: (templateString: string, context?: Record<string, any>) =>
			renderTemplate(state, templateString, context),
		runPython: (code: string, data?: Record<string, any>) =>
			runPython(state, code, data),
		installPackage: (packageName: string) => installPackage(state, packageName),
		saveTemplate: (name: string, content: string) =>
			saveTemplate(state, name, content),
		loadTemplate: (name: string) => loadTemplate(state, name),
		listTemplates: () => listTemplates(state),
		isReady: () => state.ready,
		getPackages: () => state.config.packages,
		addEventListener: (
			type: string,
			listener: EventListener,
			options?: AddEventListenerOptions,
		) => addEventListener(state, type, listener, options),
		removeEventListener: (
			type: string,
			listener: EventListener,
			options?: EventListenerOptions,
		) => removeEventListener(state, type, listener, options),
		destroy: () => destroyDjango(state),
	};
};

export { type DjangoConfig, type DjangoInstance, createDjango };
