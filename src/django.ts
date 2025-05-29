import type {
	ErrorEvent,
	EventType,
	LoadingEvent,
	ReadyEvent,
	WorkerMessageType,
	DjangoPlaygroundConfig,
	InitOptions,
	RenderOptions,
	DomElementData,
	DomScanResult,
	BatchOperationResult,
	ProgressEvent,
	IDjangoPlayground,
} from "./types";

import { 
	EVENT_TYPES, 
	FILE_EXTENSIONS, 
	WORKER_MESSAGE_TYPES,
	DOM_ATTRIBUTES,
	DjangoPlaygroundError,
	WorkerNotReadyError,
	TemplateRenderError,
	PackageInstallError,
	DomScanError,
} from "./types";
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
		throw new WorkerNotReadyError("Worker not initialized");
	}

	if (!state.ready) {
		throw new WorkerNotReadyError(
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
			throw new TemplateRenderError(result.get("error"));
		}
	} catch (error) {
		if (error instanceof TemplateRenderError) {
			throw error;
		}
		throw new TemplateRenderError(`Template rendering failed: ${(error as Error).message}`);
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
		throw new PackageInstallError(`Failed to install package: ${packageName}`);
	}
};

const installPackages = async (
	state: DjangoState,
	packages: string[],
): Promise<BatchOperationResult> => {
	return sendMessage(
		state,
		WORKER_MESSAGE_TYPES.INSTALL_PACKAGES,
		{ packages },
	);
};

const batchRender = async (
	state: DjangoState,
	templates: Array<{ template: string; context: Record<string, any> }>,
): Promise<BatchOperationResult> => {
	return sendMessage(
		state,
		WORKER_MESSAGE_TYPES.BATCH_RENDER,
		{ templates },
	);
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

// Singleton DjangoPlayground implementation
class DjangoPlayground implements IDjangoPlayground {
	private static instance: DjangoPlayground | null = null;
	private state: DjangoState | null = null;
	private initialized = false;
	private initPromise: Promise<void> | null = null;
	private config: DjangoPlaygroundConfig = {};

	private constructor() {}

	private static getInstance(): DjangoPlayground {
		if (!DjangoPlayground.instance) {
			DjangoPlayground.instance = new DjangoPlayground();
		}
		return DjangoPlayground.instance;
	}

	public static async init(options: InitOptions = {}): Promise<void> {
		const instance = DjangoPlayground.getInstance();
		return instance.initialize(options);
	}

	public static async render(
		template: string,
		context: Record<string, any> = {},
		options: RenderOptions = {}
	): Promise<string> {
		const instance = DjangoPlayground.getInstance();
		await instance.ensureInitialized();
		
		// Install packages if specified
		if (options.packages && options.packages.length > 0) {
			const result = await installPackages(instance.state!, options.packages);
			if (!result.success) {
				throw new PackageInstallError(`Failed to install packages: ${result.errors?.join(', ')}`);
			}
		}

		return renderTemplate(instance.state!, template, context);
	}

	public static cleanup(): void {
		const instance = DjangoPlayground.getInstance();
		instance.destroy();
	}

	public static isReady(): boolean {
		const instance = DjangoPlayground.getInstance();
		return instance.initialized && instance.state?.ready === true;
	}

	public static getConfig(): DjangoPlaygroundConfig {
		const instance = DjangoPlayground.getInstance();
		return { ...instance.config };
	}

	public static addEventListener(
		type: string,
		listener: EventListener,
		options?: AddEventListenerOptions
	): void {
		const instance = DjangoPlayground.getInstance();
		if (instance.state) {
			addEventListener(instance.state, type, listener, options);
		}
	}

	public static removeEventListener(
		type: string,
		listener: EventListener,
		options?: EventListenerOptions
	): void {
		const instance = DjangoPlayground.getInstance();
		if (instance.state) {
			removeEventListener(instance.state, type, listener, options);
		}
	}

	public static scanDOM(): DomScanResult {
		const instance = DjangoPlayground.getInstance();
		return instance.scanDOMForTemplates();
	}

	public static async renderDOM(): Promise<void> {
		const instance = DjangoPlayground.getInstance();
		await instance.ensureInitialized();
		await instance.renderDOMTemplates();
	}

	private async initialize(options: InitOptions): Promise<void> {
		if (this.initialized) {
			return;
		}

		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = this.doInitialize(options);
		return this.initPromise;
	}

	private async doInitialize(options: InitOptions): Promise<void> {
		try {
			// Store config
			this.config = {
				packages: options.packages || [],
				autoRender: options.autoRender !== false,
				timeout: options.timeout || 30000,
				onProgress: options.onProgress,
				onReady: options.onReady,
				onError: options.onError,
			};

			// Collect packages from DOM and options
			const domScanResult = this.scanDOMForTemplates();
			const allPackages = [...(options.packages || []), ...domScanResult.packages];
			const uniquePackages = [...new Set(allPackages)];

			// Create state
			this.state = createInitialState({
				packages: uniquePackages,
				autoInit: this.config.autoRender
			});

			// Set up event listeners
			this.setupEventListeners();

			// Initialize Django
			await initializeDjango(this.state);

			// Wait for ready state
			await this.waitForReady();

			// Install collected packages if any
			if (uniquePackages.length > 0) {
				const installResult = await installPackages(this.state, uniquePackages);
				if (!installResult.success && installResult.errors?.length) {
					console.warn('Some packages failed to install:', installResult.errors);
					if (this.config.onError) {
						this.config.onError(new PackageInstallError(
							`Package installation failures: ${installResult.errors.join(', ')}`
						));
					}
				}
			}

			// Auto-render templates if enabled
			if (this.config.autoRender) {
				await this.renderDOMTemplates();
			}

			this.initialized = true;
			
			if (this.config.onReady) {
				this.config.onReady();
			}
		} catch (error) {
			this.initPromise = null;
			const djangoError = new DjangoPlaygroundError(
				`Initialization failed: ${(error as Error).message}`,
				{ cause: error }
			);
			
			if (this.config.onError) {
				this.config.onError(djangoError);
			}
			throw djangoError;
		}
	}

	private setupEventListeners(): void {
		if (!this.state) return;

		if (this.config.onProgress) {
			addEventListener(this.state, EVENT_TYPES.LOADING, (event: Event) => {
				const detail = (event as CustomEvent).detail as LoadingEvent;
				const percent = this.extractProgressPercent(detail.step);
				this.config.onProgress!(detail.step, percent, detail.message);
			});
		}

		if (this.config.onError) {
			addEventListener(this.state, EVENT_TYPES.ERROR, (event: Event) => {
				const detail = (event as CustomEvent).detail as ErrorEvent;
				this.config.onError!(detail.error);
			});
		}
	}

	private scanDOMForTemplates(): DomScanResult {
		const elements: DomElementData[] = [];
		const packages: string[] = [];
		const errors: string[] = [];

		try {
			// Find all elements with Django template attributes
			const templateElements = document.querySelectorAll(`[${DOM_ATTRIBUTES.TEMPLATE}]`);
			
			for (const element of templateElements) {
				try {
					const elementData = this.extractElementData(element as HTMLElement);
					elements.push(elementData);
					packages.push(...elementData.packages);
				} catch (error) {
					const errorMsg = `Invalid element data: ${(error as Error).message}`;
					errors.push(errorMsg);
					console.warn(errorMsg, element);
				}
			}

			// Also scan for standalone package declarations
			const packageElements = document.querySelectorAll(`[${DOM_ATTRIBUTES.PACKAGES}]`);
			for (const element of packageElements) {
				if (!element.hasAttribute(DOM_ATTRIBUTES.TEMPLATE)) {
					try {
						const packagesAttr = element.getAttribute(DOM_ATTRIBUTES.PACKAGES);
						if (packagesAttr) {
							const elementPackages = JSON.parse(packagesAttr);
							if (Array.isArray(elementPackages)) {
								packages.push(...elementPackages);
							}
						}
					} catch (error) {
						const errorMsg = `Invalid packages attribute: ${(error as Error).message}`;
						errors.push(errorMsg);
						console.warn(errorMsg, element);
					}
				}
			}

			return {
				elements,
				packages: [...new Set(packages)], // Remove duplicates
				errors,
				success: errors.length === 0
			};
		} catch (error) {
			throw new DomScanError(`DOM scanning failed: ${(error as Error).message}`, { cause: error });
		}
	}

	private extractElementData(element: HTMLElement): DomElementData {
		const templateAttr = element.getAttribute(DOM_ATTRIBUTES.TEMPLATE);
		const packagesAttr = element.getAttribute(DOM_ATTRIBUTES.PACKAGES);
		
		let context: Record<string, any> = {};
		let packages: string[] = [];

		// Parse context
		if (templateAttr) {
			try {
				context = JSON.parse(templateAttr);
				if (typeof context !== 'object' || context === null || Array.isArray(context)) {
					context = {};
				}
			} catch (error) {
				throw new Error(`Invalid JSON in data-django-template: ${templateAttr}`);
			}
		}

		// Parse packages
		if (packagesAttr) {
			try {
				const parsed = JSON.parse(packagesAttr);
				if (Array.isArray(parsed)) {
					packages = parsed.filter(pkg => typeof pkg === 'string');
				}
			} catch (error) {
				throw new Error(`Invalid JSON in data-django-packages: ${packagesAttr}`);
			}
		}

		return {
			element,
			template: element.innerHTML,
			context,
			packages,
			loadingMessage: element.getAttribute(DOM_ATTRIBUTES.LOADING) || 'Rendering Django template...',
			errorMessage: element.getAttribute(DOM_ATTRIBUTES.ERROR) || 'Template render failed'
		};
	}

	private async renderDOMTemplates(): Promise<void> {
		const scanResult = this.scanDOMForTemplates();
		
		if (!scanResult.success) {
			console.warn('DOM scan had errors:', scanResult.errors);
		}

		// Render each template
		for (const elementData of scanResult.elements) {
			try {
				await this.renderDOMElement(elementData);
			} catch (error) {
				console.error('Failed to render DOM template:', error);
				this.showElementError(elementData.element, error as Error, elementData.errorMessage);
			}
		}
	}

	private async renderDOMElement(elementData: DomElementData): Promise<void> {
		const { element, template, context, packages, loadingMessage } = elementData;

		// Show loading state
		const originalContent = element.innerHTML;
		element.innerHTML = `<div class="django-loading">${loadingMessage}</div>`;
		element.classList.add('django-loading');

		try {
			// Install element-specific packages if needed
			if (packages.length > 0) {
				const installResult = await installPackages(this.state!, packages);
				if (!installResult.success && installResult.errors?.length) {
					console.warn(`Some packages failed for element:`, installResult.errors);
				}
			}

			// Render template
			const renderedHTML = await renderTemplate(this.state!, template, context);

			// Update element
			element.innerHTML = renderedHTML;
			element.classList.remove('django-loading');
			element.classList.add('django-rendered');
		} catch (error) {
			// Restore original content on error
			element.innerHTML = originalContent;
			element.classList.remove('django-loading');
			throw error;
		}
	}

	private showElementError(element: HTMLElement, error: Error, errorMessage: string): void {
		element.innerHTML = `<div class="django-error">${errorMessage}: ${error.message}</div>`;
		element.classList.remove('django-loading');
		element.classList.add('django-error');
	}

	private async waitForReady(): Promise<void> {
		if (!this.state) {
			throw new Error('State not initialized');
		}

		if (this.state.ready) {
			return;
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				removeEventListener(this.state!, EVENT_TYPES.READY, onReady);
				removeEventListener(this.state!, EVENT_TYPES.ERROR, onError);
				reject(new Error('Django initialization timeout'));
			}, this.config.timeout || 30000);

			const onReady = () => {
				clearTimeout(timeout);
				removeEventListener(this.state!, EVENT_TYPES.READY, onReady);
				removeEventListener(this.state!, EVENT_TYPES.ERROR, onError);
				resolve();
			};

			const onError = (event: Event) => {
				clearTimeout(timeout);
				removeEventListener(this.state!, EVENT_TYPES.READY, onReady);
				removeEventListener(this.state!, EVENT_TYPES.ERROR, onError);
				const detail = (event as CustomEvent).detail as ErrorEvent;
				reject(detail.error);
			};

			addEventListener(this.state!, EVENT_TYPES.READY, onReady);
			addEventListener(this.state!, EVENT_TYPES.ERROR, onError);
		});
	}

	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.initialize({});
		}
	}

	private extractProgressPercent(step: string): number {
		// Enhanced progress estimation based on step names
		const progressMap: Record<string, number> = {
			'initializing': 5,
			'loading_pyodide': 20,
			'setting_up_python': 40,
			'installing_packages': 65,
			'setting_up_django': 85,
			'ready': 100
		};
		
		return progressMap[step] || 50;
	}

	private destroy(): void {
		if (this.state) {
			destroyDjango(this.state);
			this.state = null;
		}
		this.initialized = false;
		this.initPromise = null;
		this.config = {};
		DjangoPlayground.instance = null;
	}
}

export { 
	type DjangoConfig, 
	type DjangoInstance, 
	type InitOptions,
	type RenderOptions,
	type DjangoPlaygroundConfig,
	type DomElementData,
	type DomScanResult,
	createDjango,
	DjangoPlayground 
};