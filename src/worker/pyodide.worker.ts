import { loadPyodide, version as pyodideVersion } from "pyodide";
import {
	LOADING_STEPS,
	WORKER_MESSAGE_TYPES,
	type WorkerMessageType,
	type BatchRenderResult,
	type PackageInstallResult,
	type TemplateRenderResult,
} from "../types";
const djangoSetupPy = `import os
from django.conf import settings
import django
from django.template import Template, Context
import traceback

def setup_django():
    """Configure and setup Django"""
    # Create template directories
    os.makedirs('/templates', exist_ok=True)

    # Configure Django with template directories
    if not settings.configured:
        settings.configure(
            SECRET_KEY='key',
            TEMPLATES=[{
                'BACKEND': 'django.template.backends.django.DjangoTemplates',
                'DIRS': ['/templates'],
                'APP_DIRS': True,
                'OPTIONS': {},
            }],
        )

    django.setup()
    print("Django setup complete!")

def render_template(template_string, context_dict=None):
    """Render a Django template with the given context"""
    if context_dict is None:
        context_dict = {}

    try:
        template = Template(template_string)
        context = Context(context_dict)
        return {
            'success': True,
            'result': template.render(context),
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'result': None,
            'error': str(e),
            'traceback': traceback.format_exc()
        }

def save_template(name, content):
    """Save a template to storage"""
    try:
        template_path = f'/templates/{name}.html'
        with open(template_path, 'w') as f:
            f.write(content)
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def load_template(name):
    """Load a template from storage"""
    try:
        template_path = f'/templates/{name}.html'
        with open(template_path, 'r') as f:
            content = f.read()
        return {'success': True, 'content': content}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def list_templates():
    """List all saved templates"""
    try:
        template_dir = '/templates'
        if os.path.exists(template_dir):
            files = [f[:-5] for f in os.listdir(template_dir) if f.endswith('.html')]
            return {'success': True, 'templates': files}
        return {'success': True, 'templates': []}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# Setup Django when this module is imported
setup_django()`;

export interface WorkerMessage {
	id: number;
	type: WorkerMessageType;
	data?: any;
}

export interface WorkerResponse {
	id?: number;
	ready?: boolean;
	result?: any;
	error?: string;
	progress?: {
		step: string;
		message: string;
	};
}

// Module-level state
let pyodide: any = null;
let ready = false;
let installedPackages = new Set<string>();

async function initialize(): Promise<void> {
	self.postMessage({
		progress: {
			step: LOADING_STEPS.PYODIDE,
			message: "Loading Pyodide runtime...",
		},
	} as WorkerResponse);

	pyodide = await loadPyodide({
		indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
	});

	self.postMessage({
		progress: {
			step: LOADING_STEPS.PACKAGES,
			message: "Installing Python packages...",
		},
	} as WorkerResponse);
	await pyodide.loadPackage("micropip");
	await installPackage("django");
	installedPackages.add("django");

	await pyodide.runPythonAsync(djangoSetupPy);

	ready = true;
	self.postMessage({
		progress: { step: LOADING_STEPS.READY, message: "Django sandbox ready!" },
	} as WorkerResponse);
}

async function installPackage(packageName: string): Promise<void> {
	if (installedPackages.has(packageName)) {
		console.log(`Package ${packageName} already installed, skipping`);
		return;
	}

	console.log(`Installing ${packageName}...`);
	const micropip = pyodide.pyimport("micropip");
	await micropip.install(packageName);
	installedPackages.add(packageName);
}

async function installPackages(packageNames: string[]): Promise<PackageInstallResult> {
	const result: PackageInstallResult = {
		success: true,
		installed: [],
		skipped: [],
		errors: [],
	};

	for (const packageName of packageNames) {
		try {
			if (installedPackages.has(packageName)) {
				result.skipped.push(packageName);
				continue;
			}

			console.log(`Installing ${packageName}...`);
			const micropip = pyodide.pyimport("micropip");
			await micropip.install(packageName);
			installedPackages.add(packageName);
			result.installed.push(packageName);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			result.errors.push(`${packageName}: ${errorMsg}`);
			result.success = false;
		}
	}

	return result;
}

async function renderTemplate(
	templateString: string,
	context: Record<string, any> = {},
): Promise<TemplateRenderResult> {
	try {
		pyodide.globals.set("template_str", templateString);
		pyodide.globals.set("context_dict", context);

		const result = pyodide.runPython(
			"render_template(template_str, context_dict)",
		);
		
		// Clean up globals to prevent memory leaks in singleton pattern
		cleanupGlobals();
		
		return result.toJs();
	} catch (error) {
		// Clean up even on error
		cleanupGlobals();
		
		return {
			success: false,
			result: null,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

async function batchRender(
	templates: Array<{ template: string; context?: Record<string, any> }>,
): Promise<BatchRenderResult> {
	const result: BatchRenderResult = {
		success: true,
		results: [],
		errors: [],
	};

	for (let i = 0; i < templates.length; i++) {
		const templateData = templates[i];
		if (!templateData) continue;
		
		const { template, context = {} } = templateData;
		try {
			const renderResult = await renderTemplate(template, context);
			result.results.push(renderResult);
			
			if (!renderResult.success) {
				result.success = false;
				result.errors.push(`Template ${i}: ${renderResult.error}`);
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			result.errors.push(`Template ${i}: ${errorMsg}`);
			result.success = false;
			result.results.push({
				success: false,
				result: null,
				error: errorMsg,
			});
		}
	}

	return result;
}

async function runPython(
	code: string,
	data?: Record<string, any>,
): Promise<any> {
	await pyodide.loadPackagesFromImports(code);

	// Set data as globals if provided
	if (data) {
		for (const [key, value] of Object.entries(data)) {
			pyodide.globals.set(key, value);
		}
	}

	const result = pyodide.runPython(code);
	
	// Clean up temporary variables to prevent memory leaks
	if (data) {
		for (const key of Object.keys(data)) {
			try {
				pyodide.runPython(`del ${key}`);
			} catch {
				// Ignore cleanup errors
			}
		}
	}
	
	return result;
}

// Memory cleanup function for better singleton pattern support
function cleanupGlobals(): void {
	try {
		// Clean up template rendering globals
		pyodide.runPython(`
try:
    del template_str
except NameError:
    pass
try:
    del context_dict
except NameError:
    pass
		`);
	} catch {
		// Ignore cleanup errors
	}
}

const initPromise = initialize().then(() => {
	self.postMessage({ ready: true } as WorkerResponse);
});

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const { id, type, data } = event.data;

	try {
		await initPromise;

		let result: any;

		switch (type) {
			case WORKER_MESSAGE_TYPES.INSTALL_PACKAGE:
				await installPackage(data.packageName);
				result = { success: true };
				break;

			case WORKER_MESSAGE_TYPES.INSTALL_PACKAGES:
				result = await installPackages(data.packageNames);
				break;

			case WORKER_MESSAGE_TYPES.RENDER_TEMPLATE:
				result = await renderTemplate(data.template, data.context);
				break;

			case WORKER_MESSAGE_TYPES.BATCH_RENDER:
				result = await batchRender(data.templates);
				break;

			case WORKER_MESSAGE_TYPES.RUN_PYTHON:
				result = await runPython(data.code, data.data);
				break;

			default:
				throw new Error(`Unknown message type: ${type}`);
		}

		self.postMessage({ id, result } as WorkerResponse);
	} catch (error) {
		self.postMessage({
			id,
			error: error instanceof Error ? error.message : String(error),
		} as WorkerResponse);
	}
};
