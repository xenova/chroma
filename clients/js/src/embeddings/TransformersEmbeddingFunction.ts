import { IEmbeddingFunction } from "./IEmbeddingFunction";

// Dynamically import module
let TransformersApi: Promise<any>;

export class TransformersEmbeddingFunction implements IEmbeddingFunction {

    private pipelinePromise: Promise<any> | null;

    /**
     * TransformersEmbeddingFunction constructor.
     * @param options The configuration options.
     * @param options.model The model to use to calculate embeddings. Defaults to 'Xenova/all-MiniLM-L6-v2', which is an ONNX port of `sentence-transformers/all-MiniLM-L6-v2`.
     * @param options.revision The specific model version to use (can be a branch, tag name, or commit id). Defaults to 'main'.
     * @param options.quantized Whether to load the 8-bit quantized version of the model. Defaults to `false`.
     * @param options.progress_callback If specified, this function will be called during model construction, to provide the user with progress updates.
     */
    constructor({
        model = 'Xenova/all-MiniLM-L6-v2',
        revision = 'main',
        quantized = false,
        progress_callback = null,
    }: { model?: string; revision?: string; quantized?: boolean; progress_callback?: Function | null; } = {}) {
        try {
            // Since Transformers.js is an ESM package, we use the dynamic `import` syntax instead of `require`.
            // Also, since we use `"module": "commonjs"` in tsconfig.json, we use the following workaround to ensure
            // the dynamic import is not transpiled to a `require` statement.
            // For more information, see https://github.com/microsoft/TypeScript/issues/43329#issuecomment-1008361973
            TransformersApi = Function('return import("@xenova/transformers")')();

        } catch (e) {
            throw new Error(
                "Please install the @xenova/transformers package to use the TransformersEmbeddingFunction, `npm install -S @xenova/transformers`."
            );
        }

        // Store a promise that resolves to the pipeline
        this.pipelinePromise = new Promise(async (resolve, reject) => {
            try {
                const { pipeline } = await TransformersApi;
                resolve(await pipeline('feature-extraction', model, { quantized, revision, progress_callback }));
            } catch (e) {
                reject(e);
            }
        });
    }

    public async generate(texts: string[]): Promise<number[][]> {
        let pipe = await this.pipelinePromise;
        let output = await pipe(texts, { pooling: 'mean', normalize: true });
        return output.tolist();
    }
}