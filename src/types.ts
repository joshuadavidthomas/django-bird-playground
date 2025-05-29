export const WORKER_MESSAGE_TYPES = {
	INIT: "init",
	RENDER_TEMPLATE: "renderTemplate",
	RUN_PYTHON: "runPython",
	INSTALL_PACKAGE: "installPackage",
	INSTALL_PACKAGES: "installPackages",
	BATCH_RENDER: "batchRender",
	SCAN_DOM: "scanDom",
	BATCH_OPERATIONS: "batchOperations",
} as const;

export const EVENT_TYPES = {
	LOADING: "loading",
	READY: "ready",
	ERROR: "error",
	PROGRESS: "progress",
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

export const DOM_ATTRIBUTES = {
	TEMPLATE: "data-django-template",
	CONTEXT: "data-django-context",
	PACKAGES: "data-django-packages",
	LOADING: "data-django-loading",
	ERROR: "data-django-error",
	OUTPUT: "data-django-output",
	CONFIG: "data-django-config",
} as const;

// Type utilities
export type WorkerMessageType =
	(typeof WORKER_MESSAGE_TYPES)[keyof typeof WORKER_MESSAGE_TYPES];
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
export type LoadingStep = (typeof LOADING_STEPS)[keyof typeof LOADING_STEPS];
export type DomAttribute = (typeof DOM_ATTRIBUTES)[keyof typeof DOM_ATTRIBUTES];

// Configuration types
export interface DjangoPlaygroundConfig {
	workerPath?: string;
	autoInit?: boolean;
	defaultPackages?: string[];
	enableProgressReporting?: boolean;
	errorReporting?: boolean;
	domScanSelector?: string;
}

export interface InitOptions {
	packages?: string[];
	onProgress?: (event: ProgressEvent) => void;
	onReady?: (event: ReadyEvent) => void;
	onError?: (event: ErrorEvent) => void;
}

// Event types
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

export interface ProgressEvent {
	operation: string;
	current: number;
	total: number;
	message?: string;
}

// DOM scanning types
export interface DomElementData {
	element: HTMLElement;
	template?: string;
	context?: Record<string, any>;
	packages?: string[];
	outputSelector?: string;
	errorSelector?: string;
	config?: Record<string, any>;
}

export interface DomScanResult {
	elements: DomElementData[];
	errors: DomScanError[];
}

export interface DomScanError {
	element: HTMLElement;
	error: string;
	attribute?: string;
}

// Operation result types
export interface TemplateRenderResult {
	success: boolean;
	result: string | null;
	error: string | null;
	traceback?: string;
}

export interface BatchRenderResult {
	success: boolean;
	results: TemplateRenderResult[];
	errors: string[];
}

export interface PackageInstallResult {
	success: boolean;
	installed: string[];
	skipped: string[];
	errors: string[];
}

// Batch operation types
export interface BatchOperation {
	type: 'render' | 'install' | 'python';
	data: any;
	id?: string;
}

export interface BatchOperationResult {
	success: boolean;
	results: Array<{
		id?: string;
		success: boolean;
		result?: any;
		error?: string;
	}>;
	errors: string[];
}

// Error types for documentation use cases
export class DjangoPlaygroundError extends Error {
	constructor(
		message: string,
		public readonly code?: string,
		public readonly context?: Record<string, any>
	) {
		super(message);
		this.name = 'DjangoPlaygroundError';
	}
}

export class WorkerNotReadyError extends DjangoPlaygroundError {
	constructor(operation: string) {
		super(`Cannot perform ${operation}: worker not ready`, 'WORKER_NOT_READY');
	}
}

export class TemplateRenderError extends DjangoPlaygroundError {
	constructor(
		message: string,
		public readonly template?: string,
		public readonly context?: Record<string, any>,
		public readonly traceback?: string
	) {
		super(message, 'TEMPLATE_RENDER_ERROR', { template, context });
	}
}

export class PackageInstallError extends DjangoPlaygroundError {
	constructor(
		message: string,
		public readonly packages?: string[],
		public readonly failedPackages?: string[]
	) {
		super(message, 'PACKAGE_INSTALL_ERROR', { packages, failedPackages });
	}
}

export class DomScanError extends DjangoPlaygroundError {
	constructor(
		message: string,
		public readonly element?: HTMLElement,
		public readonly attribute?: string
	) {
		super(message, 'DOM_SCAN_ERROR', { element, attribute });
	}
}

// DjangoPlayground singleton interface
export interface IDjangoPlayground {
	// Static methods
	init(options?: InitOptions): Promise<void>;
	renderTemplate(template: string, context?: Record<string, any>): Promise<TemplateRenderResult>;
	installPackage(packageName: string): Promise<PackageInstallResult>;
	installPackages(packages: string[]): Promise<PackageInstallResult>;
	batchRender(operations: Array<{ template: string; context?: Record<string, any> }>): Promise<BatchRenderResult>;
	scanDom(selector?: string): Promise<DomScanResult>;
	batchOperations(operations: BatchOperation[]): Promise<BatchOperationResult>;
	
	// Configuration and state
	isReady(): boolean;
	getConfig(): DjangoPlaygroundConfig;
	updateConfig(config: Partial<DjangoPlaygroundConfig>): void;
	
	// Event handling
	on(event: EventType, handler: (data: any) => void): void;
	off(event: EventType, handler: (data: any) => void): void;
	emit(event: EventType, data: any): void;
	
	// Utility methods
	parseDataAttributes(element: HTMLElement): DomElementData;
	renderToElement(element: HTMLElement, template: string, context?: Record<string, any>): Promise<void>;
	installPackagesFromElement(element: HTMLElement): Promise<PackageInstallResult>;
}
